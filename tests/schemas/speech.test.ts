import { describe, it, expect } from 'vitest';
import {
    SpeechInitResultSchema,
    SpeechTranscribeResultSchema,
    SpeechResetSessionResultSchema,
    SpeechStatusSchema,
    SpeechStatusEventSchema,
} from '@/schemas/speech';

describe('SpeechInitResultSchema', () => {
    it('parses success with message', () => {
        const result = SpeechInitResultSchema.parse({ success: true, message: 'ready' });
        expect(result.success).toBe(true);
        expect(result.message).toBe('ready');
    });

    it('parses failure with error', () => {
        const result = SpeechInitResultSchema.parse({ success: false, error: 'load failed' });
        expect(result.success).toBe(false);
        expect(result.error).toBe('load failed');
    });

    it('parses with no optional fields', () => {
        expect(() => SpeechInitResultSchema.parse({ success: true })).not.toThrow();
    });

    it('rejects missing success', () => {
        expect(SpeechInitResultSchema.safeParse({ message: 'ready' }).success).toBe(false);
    });
});

describe('SpeechTranscribeResultSchema', () => {
    it('parses successful transcription', () => {
        const result = SpeechTranscribeResultSchema.parse({ success: true, text: 'hello world' });
        expect(result.text).toBe('hello world');
    });

    it('parses failure result', () => {
        const result = SpeechTranscribeResultSchema.parse({ success: false, error: 'timeout' });
        expect(result.error).toBe('timeout');
    });

    it('rejects wrong type for success', () => {
        expect(SpeechTranscribeResultSchema.safeParse({ success: 'yes' }).success).toBe(false);
    });
});

describe('SpeechResetSessionResultSchema', () => {
    it('parses a successful reset', () => {
        expect(SpeechResetSessionResultSchema.parse({ success: true }).success).toBe(true);
    });

    it('rejects a missing success flag', () => {
        expect(() => SpeechResetSessionResultSchema.parse({})).toThrow();
    });
});

describe('SpeechStatusSchema', () => {
    it('parses both boolean states', () => {
        const result = SpeechStatusSchema.parse({ isModelLoaded: true, isModelLoading: false });
        expect(result.isModelLoaded).toBe(true);
        expect(result.isModelLoading).toBe(false);
    });

    it('rejects missing fields', () => {
        expect(SpeechStatusSchema.safeParse({ isModelLoaded: true }).success).toBe(false);
    });
});

describe('SpeechStatusEventSchema', () => {
    it.each(['loading', 'ready', 'error'] as const)('accepts status "%s"', (status) => {
        const result = SpeechStatusEventSchema.parse({ status, message: 'ok' });
        expect(result.status).toBe(status);
    });

    it('rejects invalid status', () => {
        expect(SpeechStatusEventSchema.safeParse({ status: 'idle', message: 'ok' }).success).toBe(false);
    });

    it('rejects missing message', () => {
        expect(SpeechStatusEventSchema.safeParse({ status: 'ready' }).success).toBe(false);
    });
});
