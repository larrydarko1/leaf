import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { cleanup, register } from '@/main/services/speech';

type SpeechHandlers = {
    'speech:init': () => Promise<{ success: boolean; message?: string; error?: string }>;
    'speech:transcribe': (
        _event: unknown,
        audioData: unknown,
    ) => Promise<{ success: boolean; text?: string; error?: string }>;
    'speech:getStatus': () => { isModelLoaded: boolean; isModelLoading: boolean };
    'speech:resetSession': () => { success: boolean };
};

const PATHS = vi.hoisted(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('path') as typeof import('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { tmpdir } = require('os') as typeof import('os');
    const modelRoot = join(tmpdir(), `leaf-speech-test-${process.pid}-${Date.now()}`);
    return { modelRoot };
});

const mockTranscriber = vi.hoisted(() => vi.fn());

const mockFindActiveDictationLanguage = vi.hoisted(() => vi.fn<() => Promise<string | null>>());

vi.mock('electron', () => ({}));

vi.mock('@/main/lib/logger', () => ({
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/main/lib/paths', () => ({
    getWhisperModelDir: () => PATHS.modelRoot,
}));

vi.mock('@huggingface/transformers', () => ({
    env: { cacheDir: '', allowRemoteModels: true },
    pipeline: vi.fn().mockResolvedValue(mockTranscriber),
}));

vi.mock('@/main/services/language', () => ({
    findActiveDictationLanguage: mockFindActiveDictationLanguage,
}));

function makeIpc() {
    const handlers: Partial<SpeechHandlers> = {};
    const ipc = {
        handle: vi.fn(<K extends keyof SpeechHandlers>(ch: K, fn: SpeechHandlers[K]) => {
            (handlers as Record<string, unknown>)[ch] = fn;
        }),
    };
    return { ipc, handlers: handlers as SpeechHandlers };
}

function createModelFiles() {
    const modelDir = path.join(PATHS.modelRoot, 'Xenova', 'whisper-base');
    const onnxDir = path.join(modelDir, 'onnx');
    fs.mkdirSync(onnxDir, { recursive: true });
    fs.writeFileSync(path.join(modelDir, 'config.json'), '{}');
    fs.writeFileSync(path.join(onnxDir, 'encoder_model_quantized.onnx'), '');
    fs.writeFileSync(path.join(onnxDir, 'decoder_model_merged_quantized.onnx'), '');
}

const LOUD_CHUNK = Array.from({ length: 16000 }, () => 0.3);
const SILENT_CHUNK = Array.from({ length: 16000 }, () => 0);

// Whisper internals the service reaches into; absent unless a test opts in
function attachModelInternals(detectedToken = 50274) {
    Object.assign(mockTranscriber, {
        model: {
            generation_config: { lang_to_id: { '<|en|>': 50259, '<|it|>': 50274 } },
            generate: vi.fn().mockResolvedValue([{ tolist: () => [50258, detectedToken] }]),
        },
        processor: vi.fn().mockResolvedValue({ input_features: {} }),
    });
}

function lastTranscribeOptions() {
    const calls = mockTranscriber.mock.calls;
    return calls[calls.length - 1]?.[1] as Record<string, unknown> | undefined;
}

beforeEach(() => {
    cleanup();
    fs.rmSync(PATHS.modelRoot, { recursive: true, force: true });
    mockTranscriber.mockReset();
    mockTranscriber.mockResolvedValue({ text: 'text' });
    delete (mockTranscriber as unknown as Record<string, unknown>).model;
    delete (mockTranscriber as unknown as Record<string, unknown>).processor;
    mockFindActiveDictationLanguage.mockReset();
    mockFindActiveDictationLanguage.mockResolvedValue(null);
});

afterEach(() => {
    fs.rmSync(PATHS.modelRoot, { recursive: true, force: true });
});

describe('cleanup', () => {
    it('runs without throwing', () => {
        expect(() => cleanup()).not.toThrow();
    });
});

describe('speech:getStatus', () => {
    it('reports not loaded and not loading on fresh state', () => {
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        const status = handlers['speech:getStatus']?.() as { isModelLoaded: boolean; isModelLoading: boolean };
        expect(status.isModelLoaded).toBe(false);
        expect(status.isModelLoading).toBe(false);
    });
});

describe('speech:transcribe', () => {
    it('returns failure for an empty audio array', async () => {
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        const result = (await handlers['speech:transcribe']?.({}, [])) as { success: boolean; error: string };
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/no audio data/i);
    });

    it('returns failure for non-array audio data', async () => {
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        const result = (await handlers['speech:transcribe']?.({}, 'blob')) as { success: boolean };
        expect(result.success).toBe(false);
    });

    it('returns failure when the model is not loaded', async () => {
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        const result = (await handlers['speech:transcribe']?.({}, [0.1, 0.2])) as { success: boolean; error: string };
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/not loaded/i);
    });
});

describe('speech:init', () => {
    it('returns failure when a required model file is missing', async () => {
        // modelRoot is empty — no model files exist
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        const result = (await handlers['speech:init']?.()) as { success: boolean; error: string };
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/missing model file/i);
    });

    it('loads model successfully when all files exist', async () => {
        createModelFiles();
        mockTranscriber.mockResolvedValue({ text: 'hello' });
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        const result = (await handlers['speech:init']?.()) as { success: boolean; message?: string };
        expect(result.success).toBe(true);
        expect(result.message).toMatch(/loaded/i);
    });

    it('returns "already loaded" when called twice', async () => {
        createModelFiles();
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        await handlers['speech:init']?.();
        const result = (await handlers['speech:init']?.()) as { success: boolean; message?: string };
        expect(result.success).toBe(true);
        expect(result.message).toMatch(/already loaded/i);
    });

    it('transcribes audio successfully when model is loaded', async () => {
        createModelFiles();
        mockTranscriber.mockResolvedValue({ text: 'transcribed text' });
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        await handlers['speech:init']?.();
        const result = (await handlers['speech:transcribe']?.({}, [0.1, 0.2, 0.3])) as {
            success: boolean;
            text?: string;
        };
        expect(result.success).toBe(true);
        expect(result.text).toBe('transcribed text');
    });

    it('transcribes audio when result is a plain string', async () => {
        createModelFiles();
        mockTranscriber.mockResolvedValue('plain text result');
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        await handlers['speech:init']?.();
        const result = (await handlers['speech:transcribe']?.({}, [0.1, 0.2])) as { success: boolean; text?: string };
        expect(result.success).toBe(true);
        expect(result.text).toBe('plain text result');
    });

    it('returns failure when transcription throws', async () => {
        createModelFiles();
        mockTranscriber.mockRejectedValueOnce(new Error('transcription error'));
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        await handlers['speech:init']?.();
        const result = (await handlers['speech:transcribe']?.({}, [0.1])) as { success: boolean; error?: string };
        expect(result.success).toBe(false);
    });

    it('returns "model is currently loading" when init is called while loading', async () => {
        createModelFiles();
        const { pipeline } = await import('@huggingface/transformers');
        let resolvePipeline!: (v: typeof mockTranscriber) => void;
        vi.mocked(pipeline).mockImplementationOnce(
            () =>
                new Promise<typeof mockTranscriber>((r) => {
                    resolvePipeline = r;
                }) as any,
        );

        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);

        // Start init without awaiting so isModelLoading becomes true
        const firstInitPromise = handlers['speech:init']?.();
        // Second call should see isModelLoading = true
        const result = (await handlers['speech:init']?.()) as { success: boolean; error: string };
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/currently loading/i);

        // Resolve the slow pipeline so the first init completes
        resolvePipeline(mockTranscriber);
        await firstInitPromise;
    });
});

describe('dictation language', () => {
    async function initReady() {
        createModelFiles();
        const { ipc, handlers } = makeIpc();
        register(ipc as never, () => null);
        await handlers['speech:init']?.();
        return handlers;
    }

    it('uses the language declared by the active locale', async () => {
        mockFindActiveDictationLanguage.mockResolvedValue('it');
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);

        expect(lastTranscribeOptions()).toEqual({ language: 'it' });
    });

    it('does not run detection when the locale declares a supported language', async () => {
        mockFindActiveDictationLanguage.mockResolvedValue('it');
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);

        const internals = mockTranscriber as unknown as { processor: ReturnType<typeof vi.fn> };
        expect(internals.processor).not.toHaveBeenCalled();
    });

    it('accepts a declared language regardless of case', async () => {
        mockFindActiveDictationLanguage.mockResolvedValue('IT');
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);

        expect(lastTranscribeOptions()).toEqual({ language: 'it' });
    });

    it('falls back to detection when the locale declares a language the model lacks', async () => {
        mockFindActiveDictationLanguage.mockResolvedValue('eo');
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);

        expect(lastTranscribeOptions()).toEqual({ language: 'it' });
    });

    it('detects when the locale declares nothing', async () => {
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);

        expect(lastTranscribeOptions()).toEqual({ language: 'it' });
    });

    it('does not detect a language from a silent chunk', async () => {
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, SILENT_CHUNK);

        const internals = mockTranscriber as unknown as { model: { generate: ReturnType<typeof vi.fn> } };
        expect(internals.model.generate).not.toHaveBeenCalled();
        expect(lastTranscribeOptions()).toEqual({});
    });

    it('detects once and reuses the result for the rest of the session', async () => {
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);
        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);

        const internals = mockTranscriber as unknown as { model: { generate: ReturnType<typeof vi.fn> } };
        expect(internals.model.generate).toHaveBeenCalledTimes(1);
        expect(lastTranscribeOptions()).toEqual({ language: 'it' });
    });

    it('detects again after the session is reset', async () => {
        attachModelInternals();
        const handlers = await initReady();

        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);
        await handlers['speech:resetSession']?.();
        await handlers['speech:transcribe']?.({}, LOUD_CHUNK);

        const internals = mockTranscriber as unknown as { model: { generate: ReturnType<typeof vi.fn> } };
        expect(internals.model.generate).toHaveBeenCalledTimes(2);
    });

    it('reports success from speech:resetSession', async () => {
        const handlers = await initReady();
        expect(await handlers['speech:resetSession']?.()).toEqual({ success: true });
    });
});
