import { z } from 'zod';

export const SpeechInitResultSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    error: z.string().optional(),
});

export type SpeechInitResult = z.infer<typeof SpeechInitResultSchema>;

export const SpeechTranscribeResultSchema = z.object({
    success: z.boolean(),
    text: z.string().optional(),
    error: z.string().optional(),
});

export type SpeechTranscribeResult = z.infer<typeof SpeechTranscribeResultSchema>;

export const SpeechResetSessionResultSchema = z.object({
    success: z.boolean(),
});

export type SpeechResetSessionResult = z.infer<typeof SpeechResetSessionResultSchema>;

export const SpeechStatusSchema = z.object({
    isModelLoaded: z.boolean(),
    isModelLoading: z.boolean(),
});

export type SpeechStatus = z.infer<typeof SpeechStatusSchema>;

export const SpeechStatusEventSchema = z.object({
    status: z.enum(['loading', 'ready', 'error']),
    message: z.string(),
});

export type SpeechStatusEvent = z.infer<typeof SpeechStatusEventSchema>;
