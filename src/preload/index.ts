/**
 * Preload script — bridge between frontend (Vue) and backend (Node.js).
 * Exposes safe APIs to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '@/schemas/electron';
import type { SpeechStatusEvent } from '@/schemas/speech';

// Typed against the contract the renderer consumes, so the two cannot drift.
const api: ElectronAPI = {
    // Logging (routed to electron-log in the main process)
    log: {
        error: (...args: unknown[]) => ipcRenderer.send('log:error', ...args),
        warn: (...args: unknown[]) => ipcRenderer.send('log:warn', ...args),
        info: (...args: unknown[]) => ipcRenderer.send('log:info', ...args),
        debug: (...args: unknown[]) => ipcRenderer.send('log:debug', ...args),
    },

    isElectron: () => true,

    // Open external URLs in the OS default browser
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

    // Dialog operations
    openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
    showSaveDialog: (options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
        ipcRenderer.invoke('dialog:showSaveDialog', options),

    // Binary file write
    writeBuffer: (filePath: string, base64Data: string) => ipcRenderer.invoke('file:writeBuffer', filePath, base64Data),

    // File system operations.
    scanFolder: () => ipcRenderer.invoke('files:scan'),
    closeVault: () => ipcRenderer.invoke('vault:close'),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    resolveEmbedPath: (fileName: string, noteDir: string, vaultRoot: string) =>
        ipcRenderer.invoke('file:resolveEmbedPath', fileName, noteDir, vaultRoot),
    readImage: (filePath: string) => ipcRenderer.invoke('file:readImage', filePath),
    readAudio: (filePath: string) => ipcRenderer.invoke('file:readAudio', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    createFile: (folderPath: string, fileName: string) => ipcRenderer.invoke('file:create', folderPath, fileName),
    createFolder: (parentPath: string, folderName: string) =>
        ipcRenderer.invoke('folder:create', parentPath, folderName),
    deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
    renameFile: (filePath: string, newFileName: string) => ipcRenderer.invoke('file:rename', filePath, newFileName),
    updateEmbedRefs: (oldFileName: string, newFileName: string) =>
        ipcRenderer.invoke('file:updateEmbedRefs', oldFileName, newFileName),
    renameFolder: (folderPath: string, newFolderName: string) =>
        ipcRenderer.invoke('folder:rename', folderPath, newFolderName),
    deleteFolder: (folderPath: string) => ipcRenderer.invoke('folder:delete', folderPath),
    moveFile: (filePath: string, targetFolderPath: string) =>
        ipcRenderer.invoke('file:move', filePath, targetFolderPath),
    moveFolder: (folderPath: string, targetFolderPath: string) =>
        ipcRenderer.invoke('folder:move', folderPath, targetFolderPath),

    // Audio recording
    saveAudioRecording: (folderPath: string, fileName: string, base64Data: string) =>
        ipcRenderer.invoke('audio:saveRecording', folderPath, fileName, base64Data),

    // Spellcheck

    // AI / LLM operations
    aiListModels: () => ipcRenderer.invoke('ai:listModels'),
    aiLoadModel: (modelPath: string) => ipcRenderer.invoke('ai:loadModel', modelPath),
    aiUnloadModel: () => ipcRenderer.invoke('ai:unloadModel'),
    aiChat: (userMessage: string, noteContext?: string | null) =>
        ipcRenderer.invoke('ai:chat', userMessage, noteContext),
    aiStopChat: () => ipcRenderer.invoke('ai:stopChat'),
    aiResetChat: () => ipcRenderer.invoke('ai:resetChat'),
    aiRestoreChatHistory: (messages: object[]) => ipcRenderer.invoke('ai:restoreChatHistory', messages),
    aiGetStatus: () => ipcRenderer.invoke('ai:getStatus'),
    aiOpenLeafDir: () => ipcRenderer.invoke('ai:openLeafDir'),

    // System prompt templates (~/.leaf/prompts/*.md)
    systemPromptList: () => ipcRenderer.invoke('systemPrompt:list'),
    systemPromptSetActive: (id: string) => ipcRenderer.invoke('systemPrompt:setActive', id),
    systemPromptOpenLeafDir: () => ipcRenderer.invoke('systemPrompt:openLeafDir'),

    // Theme presets (~/.leaf/themes/*.json)
    themeList: () => ipcRenderer.invoke('theme:list'),
    themeSetActive: (id: string) => ipcRenderer.invoke('theme:setActive', id),
    themeOpenLeafDir: () => ipcRenderer.invoke('theme:openLeafDir'),

    // Language files (~/.leaf/locales/*.json)
    languageList: () => ipcRenderer.invoke('language:list'),
    languageSetActive: (id: string) => ipcRenderer.invoke('language:setActive', id),
    languageLoad: (id: string) => ipcRenderer.invoke('language:load', id),
    languageOpenLeafDir: () => ipcRenderer.invoke('language:openLeafDir'),

    // AI streaming token listener
    onAiToken: (callback: (token: string) => void) => {
        ipcRenderer.on('ai:token', (_event, token: string) => callback(token));
    },
    removeAiTokenListener: () => {
        ipcRenderer.removeAllListeners('ai:token');
    },
    onAiThinkingToken: (callback: (token: string) => void) => {
        ipcRenderer.on('ai:thinkingToken', (_event, token: string) => callback(token));
    },
    removeAiThinkingTokenListener: () => {
        ipcRenderer.removeAllListeners('ai:thinkingToken');
    },

    // Conversation persistence
    conversationList: () => ipcRenderer.invoke('conversations:list'),
    conversationCreate: (modelName: string) => ipcRenderer.invoke('conversations:create', modelName),
    conversationLoad: (id: string) => ipcRenderer.invoke('conversations:load', id),
    conversationSave: (conversation: object) => ipcRenderer.invoke('conversations:save', conversation),
    conversationAddMessage: (conversationId: string, message: object) =>
        ipcRenderer.invoke('conversations:addMessage', conversationId, message),
    conversationUpdateLastMessage: (conversationId: string, content: string) =>
        ipcRenderer.invoke('conversations:updateLastMessage', conversationId, content),
    conversationDelete: (id: string) => ipcRenderer.invoke('conversations:delete', id),
    conversationRename: (id: string, newTitle: string) => ipcRenderer.invoke('conversations:rename', id, newTitle),

    // File system watcher
    watchFolder: () => ipcRenderer.invoke('fs:watchFolder'),
    unwatchFolder: () => ipcRenderer.invoke('fs:unwatchFolder'),
    onFsChanged: (callback: (data: { eventType: string; filename: string }) => void) => {
        ipcRenderer.on('fs:changed', (_event, data: { eventType: string; filename: string }) => callback(data));
    },
    removeFsChangedListener: () => {
        ipcRenderer.removeAllListeners('fs:changed');
    },

    // Clipboard
    writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),

    // Bookmarks persistence (<vault>/.leaf/bookmarks.json)
    bookmarksLoad: () => ipcRenderer.invoke('bookmarks:load'),
    bookmarksSave: (bookmarks: string[]) => ipcRenderer.invoke('bookmarks:save', bookmarks),

    // Speech-to-Text (Whisper) operations
    speechInit: () => ipcRenderer.invoke('speech:init'),
    speechTranscribe: (audioData: number[]) => ipcRenderer.invoke('speech:transcribe', audioData),
    speechGetStatus: () => ipcRenderer.invoke('speech:getStatus'),
    speechResetSession: () => ipcRenderer.invoke('speech:resetSession'),
    onSpeechStatus: (callback: (status: SpeechStatusEvent) => void) => {
        ipcRenderer.on('speech:status', (_event, status: SpeechStatusEvent) => callback(status));
    },
    removeSpeechStatusListener: () => {
        ipcRenderer.removeAllListeners('speech:status');
    },
};

contextBridge.exposeInMainWorld('electronAPI', api);
