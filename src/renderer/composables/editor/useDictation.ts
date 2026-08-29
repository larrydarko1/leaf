/**
 * useDictation — streams microphone audio to the main-process Whisper service
 * and inserts transcribed text into the editor.
 */

import { ref, type Ref } from 'vue';

const DICTATION_WORKLET_CODE = `
class DictationProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0];
        if (input && input[0] && input[0].length > 0) {
            this.port.postMessage(input[0].slice());
        }
        return true;
    }
}
registerProcessor('dictation-processor', DictationProcessor);
`;

export function useDictation(
    content: Ref<string>,
    onContentChange: () => void,
): {
    isDictating: Ref<boolean>;
    isDictationLoading: Ref<boolean>;
    toggleDictation: () => Promise<void>;
    stopDictation: () => void;
} {
    const isDictating = ref(false);
    const isDictationLoading = ref(false);

    let dictationStream: MediaStream | null = null;
    let dictationAudioContext: AudioContext | null = null;
    let dictationWorkletNode: AudioWorkletNode | null = null;
    let dictationWorkletUrl: string | null = null;
    let dictationRawSamples: Float32Array[] = [];
    let dictationInterval: number | null = null;
    let whisperModelReady = false;

    async function toggleDictation(): Promise<void> {
        if (isDictating.value) {
            stopDictation();
            return;
        }

        if (!whisperModelReady) {
            isDictationLoading.value = true;
            try {
                const status = await window.electronAPI.speechGetStatus();
                const init = status.isModelLoaded ? null : await window.electronAPI.speechInit();
                if (init !== null && !init.success) {
                    window.electronAPI.log.error('Failed to init Whisper:', init.error);
                    isDictationLoading.value = false;
                    return;
                }
                whisperModelReady = true;
            } catch (err) {
                window.electronAPI.log.error('Failed to init Whisper:', err);
                isDictationLoading.value = false;
                return;
            }
            isDictationLoading.value = false;
        }

        // Reset on start, not on stop — stopDictation still has a trailing chunk in flight.
        void window.electronAPI.speechResetSession().catch((): void => {
            // A stale detected language is not worth failing dictation over
        });

        try {
            dictationStream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
            });
        } catch (err) {
            window.electronAPI.log.error('Microphone access denied:', err);
            return;
        }

        dictationAudioContext = new AudioContext();
        const source = dictationAudioContext.createMediaStreamSource(dictationStream);

        dictationWorkletUrl = URL.createObjectURL(
            new Blob([DICTATION_WORKLET_CODE], { type: 'application/javascript' }),
        );
        try {
            await dictationAudioContext.audioWorklet.addModule(dictationWorkletUrl);
        } catch (err) {
            window.electronAPI.log.error('Failed to load audio worklet:', err);
            URL.revokeObjectURL(dictationWorkletUrl);
            dictationWorkletUrl = null;
            return;
        }

        dictationRawSamples = [];
        dictationWorkletNode = new AudioWorkletNode(dictationAudioContext, 'dictation-processor');
        dictationWorkletNode.port.onmessage = (e: MessageEvent<Float32Array>): void => {
            dictationRawSamples.push(e.data);
        };

        source.connect(dictationWorkletNode);
        dictationWorkletNode.connect(dictationAudioContext.destination);

        isDictating.value = true;

        dictationInterval = window.setInterval((): void => {
            void processDictationChunk();
        }, 5000);
    }

    async function processDictationChunk(): Promise<void> {
        if (dictationRawSamples.length === 0) return;

        const chunks = dictationRawSamples.slice();
        dictationRawSamples = [];

        const totalLength = chunks.reduce((sum, c): number => sum + c.length, 0);
        const fullAudio = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            fullAudio.set(chunk, offset);
            offset += chunk.length;
        }

        const nativeSampleRate = dictationAudioContext?.sampleRate ?? 44100;
        if (nativeSampleRate <= 0) return;

        const resampled = resampleTo16kHz(fullAudio, nativeSampleRate);

        try {
            const result = await window.electronAPI.speechTranscribe(Array.from(resampled));
            if (result.success && result.text !== null && result.text !== undefined && result.text.length > 0) {
                const trimmedText = result.text.trim();
                if (trimmedText.length > 0) {
                    const needsSpace = content.value.length > 0 && !/\s$/.test(content.value);
                    content.value += (needsSpace ? ' ' : '') + trimmedText;
                    onContentChange();
                }
            }
        } catch (err) {
            window.electronAPI.log.error('Transcription error:', err);
        }
    }

    function stopDictation(): void {
        isDictating.value = false;

        if (dictationInterval !== null) {
            clearInterval(dictationInterval);
            dictationInterval = null;
        }

        if (dictationRawSamples.length > 0 && dictationAudioContext !== null) {
            const chunks = dictationRawSamples.slice();
            dictationRawSamples = [];
            const totalLength = chunks.reduce((sum, c): number => sum + c.length, 0);
            const fullAudio = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                fullAudio.set(chunk, offset);
                offset += chunk.length;
            }
            const nativeSampleRate = dictationAudioContext.sampleRate;
            const resampled = resampleTo16kHz(fullAudio, nativeSampleRate);

            void window.electronAPI
                .speechTranscribe(Array.from(resampled))
                .then((result): void => {
                    if (
                        result.success &&
                        result.text !== null &&
                        result.text !== undefined &&
                        result.text.trim().length > 0
                    ) {
                        const needsSpace = content.value.length > 0 && !/\s$/.test(content.value);
                        content.value += (needsSpace ? ' ' : '') + result.text.trim();
                        onContentChange();
                    }
                })
                .catch((): void => {
                    // Silently ignore transcription errors on stop
                });
        }

        if (dictationWorkletNode !== null) {
            dictationWorkletNode.disconnect();
            dictationWorkletNode.port.onmessage = null;
            dictationWorkletNode = null;
        }

        if (dictationWorkletUrl !== null) {
            URL.revokeObjectURL(dictationWorkletUrl);
            dictationWorkletUrl = null;
        }

        if (dictationAudioContext !== null) {
            void dictationAudioContext.close();
            dictationAudioContext = null;
        }

        if (dictationStream !== null) {
            dictationStream.getTracks().forEach((track): void => {
                track.stop();
            });
            dictationStream = null;
        }
    }

    return { isDictating, isDictationLoading, toggleDictation, stopDictation };
}

function resampleTo16kHz(input: Float32Array, inputSampleRate: number): Float32Array {
    if (inputSampleRate === 16000) return input;
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(input.length / ratio);
    const output = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        const srcIdx = i * ratio;
        const floor = Math.floor(srcIdx);
        const frac = srcIdx - floor;
        if (floor + 1 < input.length) {
            output[i] = input[floor] * (1 - frac) + input[floor + 1] * frac;
        } else {
            output[i] = input[floor] ?? 0;
        }
    }
    return output;
}
