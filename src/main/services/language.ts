/**
 * Language Service — manages user-editable language files stored as JSON
 * files under ~/.leaf/locales/.
 *
 * Architecture mirrors theme.ts:
 *   - Each *.json file in ~/.leaf/locales/ is a language preset.
 *   - ~/.leaf/state.json records which language id is active.
 *   - Bundled defaults from <app>/assets/locales/ are copied in on first
 *     launch. On later launches, existing users get new keys backfilled from
 *     the bundle without losing their own values; files that still match the
 *     hash recorded for the last bundled copy (i.e. untouched) are fully
 *     re-synced. A hidden manifest (~/.leaf/locales/.manifest.json) tracks
 *     that hash per locale id. User-created locales have no bundled twin and
 *     are never visited at all.
 *
 * Language JSON shape:
 *   {
 *     "common": { "save": "...", ... },
 *     "app": { "title": "...", ... },
 *     ...
 *   }
 */

import { shell, type IpcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { LOCALES_DIR, getBundledLocalesDir } from '@/main/lib/paths';
import { readState as readRawState, updateState } from '@/main/lib/appState';
import { log } from '@/main/lib/logger';
import { type LanguageInfo, type LanguageState, LanguageStateSchema } from '@/schemas/vault';

/** Maps locale id -> sha256 of the bundled content it was last synced to. */
type LocaleManifest = Record<string, string>;

const DEFAULT_LANGUAGE_ID = 'en';
const LANGUAGE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MANIFEST_FILE = path.join(LOCALES_DIR, '.manifest.json');
let seedPromise: Promise<void> | null = null;

export function register(ipc: IpcMain): void {
    ipc.handle('language:list', readLanguages);

    ipc.handle('language:setActive', async (_event, id: unknown): Promise<{ success: boolean; error?: string }> => {
        if (typeof id !== 'string') return { success: false, error: 'Invalid language id' };
        return setActiveLanguage(id);
    });

    ipc.handle(
        'language:load',
        async (
            _event,
            id: unknown,
        ): Promise<{ success: boolean; content?: Record<string, unknown>; error?: string }> => {
            if (typeof id !== 'string') return { success: false, error: 'Invalid language id' };
            return loadLanguageContent(id);
        },
    );

    ipc.handle(
        'language:openLeafDir',
        async (): Promise<{ success: boolean; error?: undefined } | { success: boolean; error: string }> => {
            try {
                await fs.mkdir(LOCALES_DIR, { recursive: true });
                await shell.openPath(LOCALES_DIR);
                return { success: true };
            } catch (err) {
                return { success: false, error: (err as Error).message };
            }
        },
    );
}
/**
 * Idempotent: reconcile bundled language files into ~/.leaf/locales/.
 *
 * Memoised on the in-flight promise (not a boolean flag) so concurrent callers
 * all await the same reconciliation instead of racing through the manifest
 * read-modify-write. The "start it once" decision happens synchronously,
 * before any await. Resets to null on failure so a later call can retry.
 */
export function ensureSeeded(): Promise<void> {
    if (seedPromise === null) {
        seedPromise = doSeed().catch((err): void => {
            seedPromise = null;
            log.error('[language] seeding failed:', err);
        });
    }
    return seedPromise;
}

export async function readLanguages(): Promise<{
    success: boolean;
    languages?: LanguageInfo[];
    activeId: string;
    localesDir: string;
    error?: string;
}> {
    try {
        const languages = await listLanguagesArray();
        const state = await readState();
        return {
            success: true,
            languages,
            activeId: typeof state.activeLanguage === 'string' ? state.activeLanguage : DEFAULT_LANGUAGE_ID,
            localesDir: LOCALES_DIR,
        };
    } catch (err) {
        log.error('[language] list failed:', err);
        return {
            success: false,
            error: (err as Error).message,
            languages: [],
            activeId: DEFAULT_LANGUAGE_ID,
            localesDir: LOCALES_DIR,
        };
    }
}

export async function setActiveLanguage(id: string): Promise<{
    success: boolean;
    error?: string;
}> {
    if (typeof id !== 'string' || !isValidLanguageId(id)) {
        return { success: false, error: 'Invalid language id' };
    }
    const file = path.join(LOCALES_DIR, `${id}.json`);
    if (!existsSync(file)) return { success: false, error: 'Language not found' };
    try {
        await updateState((s): { activeLanguage: string } => ({ ...s, activeLanguage: id }));
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}

export async function loadLanguageContent(id: string): Promise<{
    success: boolean;
    content?: Record<string, unknown>;
    error?: string;
}> {
    if (typeof id !== 'string' || !isValidLanguageId(id)) {
        return { success: false, error: 'Invalid language id' };
    }
    const file = path.join(LOCALES_DIR, `${id}.json`);
    if (!existsSync(file)) {
        return { success: false, error: 'Language file not found' };
    }
    try {
        const data = await fs.readFile(file, 'utf-8');
        const content = JSON.parse(data) as Record<string, unknown>;
        return { success: true, content };
    } catch (err) {
        log.error('[language] failed to load language', { id }, err);
        return { success: false, error: (err as Error).message };
    }
}

export async function findActiveDictationLanguage(): Promise<string | null> {
    const state = await readState();
    const id = state.activeLanguage;
    if (typeof id !== 'string' || !isValidLanguageId(id)) return null;

    const result = await loadLanguageContent(id);
    if (result.content === undefined) return null;

    const meta = result.content.meta;
    if (!isPlainObject(meta)) return null;

    const code = meta.dictationLanguage;
    return typeof code === 'string' && code.trim() !== '' ? code.trim() : null;
}

export function isValidLanguageId(id: string): boolean {
    return typeof id === 'string' && LANGUAGE_ID_PATTERN.test(id);
}

async function doSeed(): Promise<void> {
    await fs.mkdir(LOCALES_DIR, { recursive: true });

    const bundled = getBundledLocalesDir();
    if (existsSync(bundled)) {
        const manifest = await readManifest();
        let manifestChanged = false;

        const entries = await fs.readdir(bundled, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue;

            const id = entry.name.replace(/\.json$/, '');
            const src = path.join(bundled, entry.name);
            const dest = path.join(LOCALES_DIR, entry.name);
            const bundledContent = await fs.readFile(src);
            const bundledHash = hashContent(bundledContent);

            if (!existsSync(dest)) {
                await fs.writeFile(dest, bundledContent);
                manifest[id] = bundledHash;
                manifestChanged = true;
                log.info('[language] Seeded language file', { file: entry.name });
                continue;
            }

            const destRaw = await fs.readFile(dest);
            const destHash = hashContent(destRaw);
            const lastSyncedHash = manifest[id];

            const isUntouchedByUser = lastSyncedHash !== undefined && destHash === lastSyncedHash;
            if (isUntouchedByUser && bundledHash !== lastSyncedHash) {
                await fs.writeFile(dest, bundledContent);
                manifest[id] = bundledHash;
                manifestChanged = true;
                log.info('[language] Re-synced language file to bundled version', { file: entry.name });
            }
            if (isUntouchedByUser) continue;

            await backfillMissingKeys(dest, destRaw, bundledContent, entry.name);
        }

        if (manifestChanged) await writeManifest(manifest);
    }
}

/** Read the shared state file and validate the language-relevant view of it. */
async function readState(): Promise<LanguageState> {
    const raw = await readRawState();
    const result = LanguageStateSchema.safeParse(raw);
    if (result.success) return result.data;
    log.warn('[language] state validation failed:', result.error);
    return {};
}

function hashContent(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively add keys present in `source` but missing from `target`,
 * preserving every value already in `target` (i.e. the user's edits and
 * existing translations). Returns true if anything was added.
 */
function fillMissingKeys(target: Record<string, unknown>, source: Record<string, unknown>): boolean {
    let changed = false;
    for (const [key, sourceValue] of Object.entries(source)) {
        const targetValue = target[key];
        if (!(key in target)) {
            target[key] = structuredClone(sourceValue);
            changed = true;
        } else if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
            if (fillMissingKeys(targetValue, sourceValue)) changed = true;
        }
        // else: key already present as a leaf (or type differs) — keep the user's value.
    }
    return changed;
}

/** Copy keys the bundled locale has and the user's copy lacks; leaves the file alone on any error. */
async function backfillMissingKeys(
    dest: string,
    destRaw: Buffer,
    bundledContent: Buffer,
    fileName: string,
): Promise<void> {
    try {
        const destJson: unknown = JSON.parse(destRaw.toString('utf-8'));
        const bundledJson: unknown = JSON.parse(bundledContent.toString('utf-8'));
        if (isPlainObject(destJson) && isPlainObject(bundledJson) && fillMissingKeys(destJson, bundledJson)) {
            await fs.writeFile(dest, JSON.stringify(destJson, null, 2) + '\n');
            log.info('[language] Backfilled missing keys', { file: fileName });
        }
    } catch (err) {
        log.warn('[language] could not merge language file, leaving as-is', { file: fileName }, err);
    }
}

async function readManifest(): Promise<LocaleManifest> {
    try {
        const data: string = await fs.readFile(MANIFEST_FILE, 'utf-8');
        const parsed: unknown = JSON.parse(data);
        if (parsed !== null && typeof parsed === 'object') return parsed as LocaleManifest;
    } catch {
        // No manifest yet (first run, or pre-dates this tracking).
    }
    return {};
}

async function writeManifest(manifest: LocaleManifest): Promise<void> {
    await fs.writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

async function listLanguagesArray(): Promise<LanguageInfo[]> {
    await ensureSeeded();
    const languages: LanguageInfo[] = [];

    try {
        const entries = await fs.readdir(LOCALES_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
            const id = entry.name.replace(/\.json$/, '');
            if (!isValidLanguageId(id)) continue;
            const filePath = path.join(LOCALES_DIR, entry.name);
            languages.push({
                id,
                name: await resolveLanguageName(id, filePath),
                path: filePath,
            });
        }
    } catch (err) {
        log.warn('[language] readLanguages failed:', err);
    }

    // Sort alphabetically by display name so the picker reads naturally.
    languages.sort((a, b): number => a.name.localeCompare(b.name));
    return languages;
}

/**
 * The label shown in the language picker. Preference order:
 *   1. `meta.name` self-declared in the locale file (endonym, e.g. "Français").
 *   2. Intl.DisplayNames for standard BCP-47 ids (fallback for files that
 *      predate the field, or that a user forgot to annotate).
 *   3. The uppercased id (e.g. "MYLANG") — last resort for custom locales.
 */
async function resolveLanguageName(id: string, filePath: string): Promise<string> {
    try {
        const parsed: unknown = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        if (isPlainObject(parsed) && isPlainObject(parsed.meta)) {
            const name = parsed.meta.name;
            if (typeof name === 'string' && name.trim() !== '') return name.trim();
        }
    } catch (err) {
        log.warn('[language] could not read language name', { id }, err);
    }
    return intlDisplayName(id) ?? id.toUpperCase();
}

/** Endonym for a BCP-47 id via Intl, or null if the id isn't recognised. */
function intlDisplayName(id: string): string | null {
    try {
        const name = new Intl.DisplayNames([id], { type: 'language' }).of(id);
        // Unknown codes echo the id back — treat that as "no name".
        if (typeof name === 'string' && name.toLowerCase() !== id.toLowerCase()) {
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    } catch {
        // Intl throws RangeError on non-BCP-47 ids (e.g. user-invented locales).
    }
    return null;
}
