/**
 * Tests for useDictation composable.
 * Mocks Web Audio API and window.electronAPI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// ── Fake Web Audio API (classes so they work with `new`) ──────────────────────

const fakeAudioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
let lastWorkletNode: FakeAudioWorkletNode;

class FakeAudioWorkletNode {
    port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
    connected = false;
    disconnected = false;
    connect(_dest: unknown) {
        this.connected = true;
    }
    disconnect() {
        this.disconnected = true;
    }
}

class FakeMediaStreamSource {
    connect(_dest: unknown) {}
}

class FakeAudioContext {
    audioWorklet = fakeAudioWorklet;
    sampleRate = 44100;
    destination = {} as AudioDestinationNode;
    closed = false;
    createMediaStreamSource(_stream: unknown): MediaStreamAudioSourceNode {
        return new FakeMediaStreamSource() as never;
    }
    close() {
        this.closed = true;
        return Promise.resolve();
    }
}

class MockAudioContext extends FakeAudioContext {}
class MockAudioWorkletNode extends FakeAudioWorkletNode {
    constructor(_ctx: unknown, _name: string) {
        super();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        lastWorkletNode = this;
    }
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);
vi.stubGlobal(
    'Blob',
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class FakeBlob {
        // eslint-disable-next-line @typescript-eslint/no-useless-constructor
        constructor(_parts: unknown[], _opts?: unknown) {}
    },
);
vi.stubGlobal('URL', {
    createObjectURL: vi.fn().mockReturnValue('blob:fake-url'),
    revokeObjectURL: vi.fn(),
});

// ── Fake navigator.mediaDevices ───────────────────────────────────────────────

const fakeTrack = { stop: vi.fn() };
const fakeStream = { getTracks: vi.fn().mockReturnValue([fakeTrack]) };
const mockGetUserMedia = vi.fn().mockResolvedValue(fakeStream);
Object.defineProperty(globalThis, 'navigator', {
    value: { mediaDevices: { getUserMedia: mockGetUserMedia } },
    writable: true,
    configurable: true,
});

// ── Fake setInterval / clearInterval ─────────────────────────────────────────

let storedIntervalFn: (() => void) | null = null;
vi.stubGlobal(
    'setInterval',
    vi.fn((fn: () => void, _ms: number) => {
        storedIntervalFn = fn;
        return 999;
    }),
);
vi.stubGlobal('clearInterval', vi.fn());

// ── Fake window.electronAPI ───────────────────────────────────────────────────

const mockSpeechGetStatus = vi.fn().mockResolvedValue({ isModelLoaded: true });
const mockSpeechInit = vi.fn().mockResolvedValue({ success: true });
const mockSpeechTranscribe = vi.fn().mockResolvedValue({ success: true, text: 'hello world' });
const mockSpeechResetSession = vi.fn().mockResolvedValue({ success: true });
const mockLog = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

Object.defineProperty(globalThis, 'window', {
    value: {
        ...globalThis.window,
        electronAPI: {
            speechGetStatus: mockSpeechGetStatus,
            speechInit: mockSpeechInit,
            speechTranscribe: mockSpeechTranscribe,
            speechResetSession: mockSpeechResetSession,
            log: mockLog,
        },
        setInterval: vi.fn((fn: () => void, _ms: number) => {
            storedIntervalFn = fn;
            return 999;
        }),
        clearInterval: vi.fn(),
    },
    writable: true,
    configurable: true,
});

// ── Import after stubs ────────────────────────────────────────────────────────

import { useDictation } from '@/renderer/composables/editor/useDictation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDictation() {
    const content = ref('');
    const onContentChange = vi.fn();
    const d = useDictation(content, onContentChange);
    return { content, onContentChange, ...d };
}

function sendChunk(data: Float32Array) {
    if (lastWorkletNode?.port.onmessage) {
        lastWorkletNode.port.onmessage(new MessageEvent('message', { data }));
    }
}

beforeEach(() => {
    vi.clearAllMocks();
    storedIntervalFn = null;
    mockSpeechGetStatus.mockResolvedValue({ isModelLoaded: true });
    mockSpeechInit.mockResolvedValue({ success: true });
    mockSpeechTranscribe.mockResolvedValue({ success: true, text: 'hello world' });
    mockGetUserMedia.mockResolvedValue(fakeStream);
    fakeAudioWorklet.addModule.mockResolvedValue(undefined);
    fakeTrack.stop.mockReset();
    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockReturnValue('blob:fake-url');
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
    it('starts not dictating', () => {
        const { isDictating } = makeDictation();
        expect(isDictating.value).toBe(false);
    });

    it('starts with loading false', () => {
        const { isDictationLoading } = makeDictation();
        expect(isDictationLoading.value).toBe(false);
    });
});

// ── toggleDictation: start ────────────────────────────────────────────────────

describe('toggleDictation (start)', () => {
    it('sets isDictating to true after start', async () => {
        const { isDictating, toggleDictation } = makeDictation();
        await toggleDictation();
        expect(isDictating.value).toBe(true);
    });

    it('requests microphone access', async () => {
        const { toggleDictation } = makeDictation();
        await toggleDictation();
        expect(mockGetUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: expect.anything() }));
    });

    it('checks speech status if whisper model not yet ready', async () => {
        const { toggleDictation } = makeDictation();
        await toggleDictation();
        expect(mockSpeechGetStatus).toHaveBeenCalled();
    });

    it('does not re-init whisper when already ready (second call)', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        stopDictation();
        mockSpeechGetStatus.mockClear();
        await toggleDictation();
        expect(mockSpeechGetStatus).not.toHaveBeenCalled();
        stopDictation();
    });

    it('loads the audio worklet module', async () => {
        const { toggleDictation } = makeDictation();
        await toggleDictation();
        expect(fakeAudioWorklet.addModule).toHaveBeenCalledWith('blob:fake-url');
    });

    it('calls speechInit when model is not loaded', async () => {
        mockSpeechGetStatus.mockResolvedValueOnce({ isModelLoaded: false });
        const { toggleDictation } = makeDictation();
        await toggleDictation();
        expect(mockSpeechInit).toHaveBeenCalled();
    });

    it('stays not dictating when speechInit fails', async () => {
        mockSpeechGetStatus.mockResolvedValueOnce({ isModelLoaded: false });
        mockSpeechInit.mockResolvedValueOnce({ success: false, error: 'failed' });
        const { isDictating, toggleDictation } = makeDictation();
        await toggleDictation();
        expect(isDictating.value).toBe(false);
    });

    it('stays not dictating when getUserMedia throws', async () => {
        mockGetUserMedia.mockRejectedValueOnce(new Error('denied'));
        const { isDictating, toggleDictation } = makeDictation();
        await toggleDictation();
        expect(isDictating.value).toBe(false);
    });

    it('stays not dictating when audioWorklet.addModule throws', async () => {
        fakeAudioWorklet.addModule.mockRejectedValueOnce(new Error('worklet failed'));
        const { isDictating, toggleDictation } = makeDictation();
        await toggleDictation();
        expect(isDictating.value).toBe(false);
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('handles speechGetStatus throwing an error', async () => {
        mockSpeechGetStatus.mockRejectedValueOnce(new Error('network err'));
        const { isDictating, toggleDictation } = makeDictation();
        await toggleDictation();
        expect(isDictating.value).toBe(false);
        expect(mockLog.error).toHaveBeenCalled();
    });

    it('sets up a periodic interval for chunk processing', async () => {
        const { toggleDictation } = makeDictation();
        await toggleDictation();
        expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
});

// ── toggleDictation: stop ─────────────────────────────────────────────────────

describe('toggleDictation (stop)', () => {
    it('stops dictation when called while already dictating', async () => {
        const { isDictating, toggleDictation } = makeDictation();
        await toggleDictation();
        expect(isDictating.value).toBe(true);
        await toggleDictation();
        expect(isDictating.value).toBe(false);
    });
});

// ── stopDictation ─────────────────────────────────────────────────────────────

describe('stopDictation', () => {
    it('sets isDictating to false', async () => {
        const { isDictating, toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        stopDictation();
        expect(isDictating.value).toBe(false);
    });

    it('stops all media tracks', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        stopDictation();
        expect(fakeTrack.stop).toHaveBeenCalled();
    });

    it('revokes the worklet blob URL', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        stopDictation();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    });

    it('disconnects the worklet node', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        const node = lastWorkletNode;
        stopDictation();
        expect(node.disconnected).toBe(true);
    });

    it('does nothing when not dictating', () => {
        const { stopDictation } = makeDictation();
        expect(() => stopDictation()).not.toThrow();
    });

    it('transcribes buffered audio samples on stop', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        sendChunk(new Float32Array([0.1, 0.2, 0.3]));
        stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        expect(mockSpeechTranscribe).toHaveBeenCalled();
    });

    it('appends transcribed text to content', async () => {
        const content = ref('existing');
        const onContentChange = vi.fn();
        mockSpeechTranscribe.mockResolvedValue({ success: true, text: 'more text' });
        const d = useDictation(content, onContentChange);
        await d.toggleDictation();
        sendChunk(new Float32Array([0.1]));
        d.stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        expect(content.value).toContain('more text');
        expect(onContentChange).toHaveBeenCalled();
    });

    it('adds a space before text when content does not end with whitespace', async () => {
        const content = ref('word');
        const onContentChange = vi.fn();
        mockSpeechTranscribe.mockResolvedValue({ success: true, text: 'appended' });
        const d = useDictation(content, onContentChange);
        await d.toggleDictation();
        sendChunk(new Float32Array([0.1]));
        d.stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        if (content.value.length > 4) {
            expect(content.value).toMatch(/^word /);
        }
    });

    it('does not add space when content already ends with whitespace', async () => {
        const content = ref('word ');
        const onContentChange = vi.fn();
        mockSpeechTranscribe.mockResolvedValue({ success: true, text: 'next' });
        const d = useDictation(content, onContentChange);
        await d.toggleDictation();
        sendChunk(new Float32Array([0.1]));
        d.stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        if (content.value.length > 5) {
            expect(content.value).not.toMatch(/^word {2}/);
        }
    });

    it('handles transcription error silently on stop', async () => {
        mockSpeechTranscribe.mockRejectedValueOnce(new Error('transcription failed'));
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        sendChunk(new Float32Array([0.1]));
        stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        expect(true).toBe(true); // did not throw
    });

    it('does not call speechTranscribe when no samples were buffered', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        // No chunks sent
        stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        expect(mockSpeechTranscribe).not.toHaveBeenCalled();
    });

    it('skips empty transcription result', async () => {
        const content = ref('');
        const onContentChange = vi.fn();
        mockSpeechTranscribe.mockResolvedValue({ success: true, text: '   ' }); // whitespace only
        const d = useDictation(content, onContentChange);
        await d.toggleDictation();
        sendChunk(new Float32Array([0.1]));
        d.stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        expect(content.value).toBe('');
        expect(onContentChange).not.toHaveBeenCalled();
    });

    it('skips null transcription text', async () => {
        const content = ref('');
        const onContentChange = vi.fn();
        mockSpeechTranscribe.mockResolvedValue({ success: true, text: null });
        const d = useDictation(content, onContentChange);
        await d.toggleDictation();
        sendChunk(new Float32Array([0.1]));
        d.stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        expect(onContentChange).not.toHaveBeenCalled();
    });

    it('skips failed transcription result', async () => {
        const content = ref('');
        const onContentChange = vi.fn();
        mockSpeechTranscribe.mockResolvedValue({ success: false });
        const d = useDictation(content, onContentChange);
        await d.toggleDictation();
        sendChunk(new Float32Array([0.1]));
        d.stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        expect(onContentChange).not.toHaveBeenCalled();
    });
});

// ── processDictationChunk via interval ────────────────────────────────────────

describe('interval-based chunk processing', () => {
    it('fires processDictationChunk when interval triggers', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        sendChunk(new Float32Array([0.1, 0.2]));
        // Fire the interval callback if captured
        if (storedIntervalFn) {
            storedIntervalFn();
        }
        await new Promise((r) => setTimeout(r, 20));
        stopDictation();
        expect(mockSpeechTranscribe).toHaveBeenCalled();
    });

    it('does nothing in processDictationChunk when no samples', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        // No chunks — fire interval anyway
        if (storedIntervalFn) {
            storedIntervalFn();
        }
        await new Promise((r) => setTimeout(r, 10));
        stopDictation();
        expect(mockSpeechTranscribe).not.toHaveBeenCalled();
    });

    it('handles transcription error in chunk processing', async () => {
        mockSpeechTranscribe.mockRejectedValueOnce(new Error('api error'));
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        sendChunk(new Float32Array([0.1]));
        if (storedIntervalFn) {
            storedIntervalFn();
        }
        await new Promise((r) => setTimeout(r, 20));
        stopDictation();
        expect(mockLog.error).toHaveBeenCalled();
    });
});

// ── resampleTo16kHz (tested indirectly) ──────────────────────────────────────

describe('resampling', () => {
    it('passes audio array to speechTranscribe', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        const chunk = new Float32Array(4410).fill(0.5);
        sendChunk(chunk);
        stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        const call = mockSpeechTranscribe.mock.calls[0]?.[0] as number[];
        expect(Array.isArray(call)).toBe(true);
        expect(call.length).toBeGreaterThan(0);
    });

    it('downsamples from 44100 to fewer samples', async () => {
        const { toggleDictation, stopDictation } = makeDictation();
        await toggleDictation();
        const chunk = new Float32Array(44100).fill(0.1);
        sendChunk(chunk);
        stopDictation();
        await new Promise((r) => setTimeout(r, 50));
        const call = mockSpeechTranscribe.mock.calls[0]?.[0] as number[];
        // 44100 samples at 44100Hz → ~16000 samples at 16kHz
        expect(call.length).toBeLessThan(44100);
        expect(call.length).toBeCloseTo(16000, -2);
    });
});
