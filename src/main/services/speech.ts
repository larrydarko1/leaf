/**
 * Speech-to-Text Service — local Whisper inference via @huggingface/transformers.
 * Runs in the Electron main process using onnxruntime-node for native ONNX inference.
 * Model is pre-downloaded and bundled; 100% offline at runtime.
 */

import type { IpcMain, BrowserWindow } from 'electron';
import type { pipeline as PipelineFn } from '@huggingface/transformers';
import path from 'path';
import { existsSync } from 'fs';
import { getWhisperModelDir } from '@/main/lib/paths';
import { findActiveDictationLanguage } from '@/main/services/language';
import { log } from '@/main/lib/logger';
import type { Transcriber, TranscriptionResult, TransformersModule } from '@/schemas/vault';

// Minimal shape of the pipeline internals we need for language detection
// Property names must match @huggingface/transformers API exactly
/* eslint-disable @typescript-eslint/naming-convention */
type WhisperPipeline = {
    model: {
        generate(opts: Record<string, unknown>): Promise<ArrayLike<{ tolist(): (number | bigint)[] }>>;
        generation_config: { lang_to_id: Record<string, number> };
    };
    processor(audio: Float32Array): Promise<{ input_features: unknown }>;
};
/* eslint-enable @typescript-eslint/naming-convention */

// Whisper decoder_start_token_id — constant across all Whisper models
const WHISPER_SOT = 50258;

// Below this RMS a chunk is silence or room tone — too weak to detect a language from
const MIN_DETECTION_RMS = 0.005;
const MIN_DETECTION_SAMPLES = 16000;

let pipelineFn: typeof PipelineFn | null = null;
let transcriber: Transcriber | null = null;
let isModelLoading = false;
let isModelReady = false;

let supportedLanguages: Set<string> | null = null;
let sessionLanguage: string | null = null;

export function cleanup(): void {
    transcriber = null;
    isModelReady = false;
    isModelLoading = false;
    supportedLanguages = null;
    sessionLanguage = null;
}

export function register(ipc: IpcMain, findMainWindow: () => BrowserWindow | null): void {
    ipc.handle(
        'speech:init',
        async (): Promise<{ success: boolean; message?: string; error?: string }> => initModel(findMainWindow()),
    );
    ipc.handle(
        'speech:transcribe',
        async (_event, audioData: number[]): Promise<{ success: boolean; text?: string; error?: string }> => {
            if (!Array.isArray(audioData) || audioData.length === 0) return { success: false, error: 'No audio data' };
            return transcribe(audioData);
        },
    );
    ipc.handle('speech:getStatus', (): { isModelLoaded: boolean; isModelLoading: boolean } => getStatus());
    ipc.handle('speech:resetSession', (): { success: boolean } => resetSession());
}

/**
 * Dynamically import @huggingface/transformers (ESM module from CJS)
 * Same pattern used by ai-service.ts for node-llama-cpp.
 */
async function getTransformers(): Promise<typeof PipelineFn> {
    if (pipelineFn !== null) return pipelineFn;

    const transformers = (await import('@huggingface/transformers')) as TransformersModule;

    // Point cache to the bundled model directory
    const cacheDir = getWhisperModelDir();
    transformers.env.cacheDir = cacheDir;
    // No remote downloads — model is already bundled
    transformers.env.allowRemoteModels = false;

    // Verify model files exist before proceeding
    const modelDir = path.join(cacheDir, 'Xenova', 'whisper-base');
    const onnxDir = path.join(modelDir, 'onnx');
    const requiredFiles = [
        path.join(modelDir, 'config.json'),
        path.join(onnxDir, 'encoder_model_quantized.onnx'),
        path.join(onnxDir, 'decoder_model_merged_quantized.onnx'),
    ];
    for (const requiredFile of requiredFiles) {
        if (!existsSync(requiredFile)) {
            log.error('[Speech] Missing required model file:', requiredFile);
            throw new Error(`Missing model file: ${path.basename(requiredFile)}`);
        }
    }
    log.info('[Speech] All model files verified at:', modelDir);

    pipelineFn = transformers.pipeline;
    return pipelineFn;
}

async function initModel(
    mainWindow: BrowserWindow | null,
): Promise<{ success: boolean; message?: string; error?: string }> {
    if (transcriber !== null) {
        return { success: true, message: 'Model already loaded' };
    }
    if (isModelLoading) {
        return { success: false, error: 'Model is currently loading' };
    }

    isModelLoading = true;

    try {
        const pipeline = await getTransformers();

        if (mainWindow !== null && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('speech:status', {
                status: 'loading',
                message: 'Loading Whisper model...',
            });
        }

        transcriber = (await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
            revision: 'main',
            dtype: 'q8',
        })) as Transcriber;

        supportedLanguages = readSupportedLanguages();
        isModelReady = true;
        isModelLoading = false;

        if (mainWindow !== null && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('speech:status', {
                status: 'ready',
                message: 'Whisper model ready',
            });
        }

        log.info('[Speech] Whisper model loaded successfully');
        return { success: true, message: 'Whisper model loaded' };
    } catch (error) {
        isModelLoading = false;
        isModelReady = false;
        log.error('[Speech] Failed to load Whisper model:', error);

        if (mainWindow !== null && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('speech:status', {
                status: 'error',
                message: (error as Error).message,
            });
        }

        return { success: false, error: (error as Error).message };
    }
}

/** The `<|xx|>` keys of the model's own language table, as bare codes. */
function readSupportedLanguages(): Set<string> | null {
    try {
        const langToId = (transcriber as unknown as WhisperPipeline).model.generation_config.lang_to_id;
        const codes = new Set<string>();
        for (const langKey of Object.keys(langToId)) {
            const match = /\|(.+)\|/.exec(langKey);
            if (match !== null) codes.add(match[1]);
        }
        return codes.size > 0 ? codes : null;
    } catch (err) {
        log.warn('[Speech] Could not read model language table:', err);
        return null;
    }
}

async function resolveLanguage(float32Audio: Float32Array): Promise<string | null> {
    const declared = (await findActiveDictationLanguage())?.toLowerCase() ?? null;
    if (declared !== null && supportedLanguages !== null && supportedLanguages.has(declared)) {
        return declared;
    }
    if (sessionLanguage !== null) return sessionLanguage;
    // A guess made on silence would poison the whole session — wait for a chunk with speech in it
    if (!hasSpeechSignal(float32Audio)) return null;

    if (declared !== null) {
        log.warn('[Speech] Locale declares an unsupported dictation language, detecting instead:', declared);
    }
    sessionLanguage = await detectLanguage(float32Audio);
    return sessionLanguage;
}

/** True when the chunk is long and loud enough to be worth detecting a language from. */
function hasSpeechSignal(float32Audio: Float32Array): boolean {
    if (float32Audio.length < MIN_DETECTION_SAMPLES) return false;
    let sumSquares = 0;
    for (const sample of float32Audio) sumSquares += sample * sample;
    return Math.sqrt(sumSquares / float32Audio.length) >= MIN_DETECTION_RMS;
}

/**
 * Detects the spoken language by running a single decoder step with only the
 * start-of-transcript token and reading whichever language token the model predicts.
 * Called once per model session; result is cached in `detectedLanguage`.
 *
 * v3.8.1 of @huggingface/transformers does not implement automatic language detection
 * (the relevant code path is unimplemented upstream and defaults to English), so we do it
 * manually here via the model's internal generate API.
 */
async function detectLanguage(float32Audio: Float32Array): Promise<string | null> {
    if (transcriber === null) {
        return null;
    }
    try {
        const pipe = transcriber as unknown as WhisperPipeline;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { input_features } = await pipe.processor(float32Audio);

        // max_new_tokens: 1 — generate only the language token after [<|startoftranscript|>]
        const outputs = await pipe.model.generate({
            inputs: input_features,
            decoder_input_ids: [WHISPER_SOT],
            max_new_tokens: 1,
        });

        // outputs[0] = [WHISPER_SOT, langToken]
        const tokens = outputs[0].tolist();
        const langToken = Number(tokens[1]);

        const langToId = pipe.model.generation_config.lang_to_id;
        for (const [langKey, tokenId] of Object.entries(langToId)) {
            if (Number(tokenId) !== langToken) continue;
            const match = /\|(.+)\|/.exec(langKey);
            if (match === null) continue;
            log.info('[Speech] Language detected:', match[1]);
            return match[1];
        }
        return null;
    } catch (err) {
        log.warn('[Speech] Language detection failed, falling back to model default:', err);
        return null;
    }
}

async function transcribe(audioData: number[]): Promise<{ success: boolean; text?: string; error?: string }> {
    if (transcriber === null || !isModelReady) {
        return { success: false, error: 'Whisper model not loaded' };
    }

    try {
        const float32Audio = new Float32Array(audioData);

        const language = await resolveLanguage(float32Audio);

        const call = transcriber as unknown as (
            audio: Float32Array,
            options: Record<string, unknown>,
        ) => Promise<unknown>;

        const options: Record<string, unknown> = language !== null ? { language } : {};
        const result = (await call(float32Audio, options)) as TranscriptionResult;
        const text = typeof result === 'string' ? result : (result.text ?? '');
        return { success: true, text: text.trim() };
    } catch (error) {
        log.error('[Speech] Transcription error:', error);
        return { success: false, error: (error as Error).message };
    }
}

function getStatus(): { isModelLoaded: boolean; isModelLoading: boolean } {
    return { isModelLoaded: isModelReady, isModelLoading };
}

/** Clears the detected-language fallback so the next dictation run starts fresh. */
function resetSession(): { success: boolean } {
    sessionLanguage = null;
    return { success: true };
}
