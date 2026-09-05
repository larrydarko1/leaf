<img src="public/banner.png">

If you find Leaf useful, consider [giving it a star ⭐](https://github.com/larrydarko1/leaf) — it helps others discover the project!

Leaf is a **local-first, privacy-focused note-taking app** for desktop built with **Electron**, **Vue 3**, and TypeScript. Inspired by [Obsidian](https://obsidian.md) and [LM Studio](https://lmstudio.ai), Leaf provides a clean, distraction-free environment for managing your notes with local AI capabilities. All your data stays on your device - no cloud, no database, no tracking.

# Demo

![Leaf Demo](./public/demo.png)

## Features

### Note Management

- **Vault-based system** - Select any folder as your vault
- **Multi-format support** - Read and edit `.txt` and `.md` (Markdown) files
- **Image support** - View images directly in the app (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`)
- **Video support** - Play videos directly in the app (`.mp4`, `.webm`, `.ogg`, `.mov`, `.avi`, `.mkv`)
- **Audio support** - Play audio files directly in the app (`.mp3`, `.wav`, `.flac`, `.aac`, `.m4a`, `.ogg`, `.wma`, `.aiff`)
- **Audio recording** - Record voice notes directly in the app and save as `.wav` files to your vault
- **Speech-to-text dictation** - Dictate into `.txt` and `.md` files using local Whisper speech recognition; transcribes in the language your app is set to — no cloud, no API keys
- **File browser** - Navigate your notes with a tree-based folder structure
- **Obsidian-style media embeds** - Use `![[image.png]]` syntax in Markdown to embed images, videos, audio, and PDFs inline — fully interoperable with Obsidian vaults
- **Drag & drop embed** - Drag media files from the file explorer onto a Markdown note to automatically insert embed syntax
- **Drag & drop organization** - Move files between folders with drag and drop
- **Folder nesting** - Organize folders by dragging them into other folders
- **Auto-save** - Changes save automatically as you type

### AI Assistant (Local LLM)

- **100% local inference** - Run AI models directly on your machine, no cloud or API keys needed
- **Chat interface** - Built-in chat panel with streaming responses
- **Conversation history** - All chats are automatically saved as JSON and can be browsed, loaded, renamed, or deleted
- **Conversation restore** - Reloading a model or switching conversations automatically restores context so the AI remembers what you discussed
- **Note-aware context** - Toggle to include the current note as context for AI queries
- **Editable system prompts** - Pick from bundled templates or hand-edit Markdown files in `~/.leaf/prompts/` to customise the AI’s personality and behaviour
- **Model management** - Load and unload GGUF models from a dedicated models folder (`~/.leaf/models/`)
- **GPU accelerated** - Automatically uses Metal (macOS), CUDA (NVIDIA), or Vulkan for fast inference
- **Powered by llama.cpp** - Uses [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) bindings to [llama.cpp](https://github.com/ggml-org/llama.cpp) (both MIT licensed)

### Privacy & Storage

- **Fully offline** - AI inference, dictation, and notes all run locally; the app makes no network requests at all
- **Local-only** - Notes never leave your device
- **User-accessible files** - Direct access to your vault folder
- **No database** - Plain text files you can open anywhere
- **No tracking** - Zero telemetry or data collection

### Design

- **Obsidian-inspired UI** - Clean, familiar interface
- **Multi-language support** - 14 built-in languages with easy language switching; add your own translations
- **Theme customization** - 20+ built-in color themes; drop in your own for automatic detection

## Security & Privacy

Leaf is built with privacy and security as core principles:

### Privacy Guarantees

- **No telemetry** - No collection of any usage data, analytics, or crash reports
- **No network requests** - The app makes no outbound connections; no note data or usage data is ever transmitted
- **No cloud sync** - Your notes never leave your device unless you explicitly copy them
- **No accounts** - No sign-ups, logins, or user tracking of any kind
- **Local AI** - AI inference runs entirely on your hardware; no data is sent to any server

### Security Architecture

- **Sandboxed renderer** - Context isolation prevents unauthorized system access
- **Local file system only** - File operations are limited to your selected vault folder
- **No remote code execution** - All code runs locally on your device
- **Open source** - Full transparency - audit the code yourself

### Reporting Security Issues

If you discover a security vulnerability, **do not open a public issue.** Email the maintainer at <hello@larrydarko.dev> — see [SECURITY.md](.github/SECURITY.md) for scope and what to expect.

## Data Storage

### Your Notes

Your notes are stored exactly where you choose - simply select any folder on your system as your vault. Common locations:

- **macOS:** `~/Documents/Notes/`, `~/Desktop/MyVault/`
- **Linux:** `~/Documents/Notes/`, `~/notes/`

> **Note:** Your vault folder can be anywhere on your system. Use it with other apps, back it up to external drives, sync with git - it's just plain text files!

### AI Models

Leaf stores AI models in `~/.leaf/models/`. To get started with the AI assistant:

1. Download a `.gguf` model from wherever you like — [Hugging Face](https://huggingface.co/models?library=gguf) is the usual source, and downloading with your own account credentials is faster and works with gated repos
2. Place the file in `~/.leaf/models/` (any `.gguf` file in that folder is picked up, including in subfolders)
3. Open the AI panel by clicking the lightbulb icon in the sidebar
4. Click the **folder** icon to open the models directory, or the **refresh** icon if you added a file while the app was running
5. Select and load the model from the dropdown in the AI panel

> **Tip:** Pick a quantization that fits your RAM — a rough guide is that a `Q4_K_M` file needs about its own file size in free memory, plus room for the context window.

> **Migrating from older versions:** If you previously stored models in `~/leaf-models/`, Leaf automatically moves them to `~/.leaf/models/` on first launch. No action required.

### Themes

Leaf ships with 20+ built-in color themes. All themes are stored in `~/.leaf/themes/`:

1. Open the app and click the **palette icon** in the sidebar (or use the theme menu)
2. Select a theme from the built-in list to apply it instantly
3. To add custom themes:
    - Create a new `.json` file in `~/.leaf/themes/` with your color definitions
    - Restart the app — your custom theme appears automatically in the picker

Theme file format (see `~/.leaf/themes/dark.json` for examples):

```json
{
    "name": "My Custom Theme",
    "description": "A Small description",
    "scheme": "dark", // or light
    "colors": {
        "text1": "#ffffff",
        "bg-primary": "#1e1e1e",
        "accent-color": "#3eb489"
        // ... more color definitions
    }
}
```

Bundled defaults (`dark.json`, `light.json`, etc.) are seeded on first launch and never overwritten if you've edited them.

### Languages & Localization

Leaf supports multiple languages. Currently available:

- **Chinese (simplified)**
- **English** (default)
- **Brainrot**
- **Esperanto**
- **French**
- **German**
- **Greek**
- **Hindi**
- **Italian**
- **Japanese**
- **Korean**
- **Latin**
- **Portuguese**
- **Russian**
- **Spanish**

disclaimer: translations are done by AI, they may be inaccurate.

To switch languages:

1. Click the **language menu** in the settings (top-right or settings panel)
2. Select your preferred language — the UI updates instantly
3. To add your own language translations:
    - Create a new `.json` file in `~/.leaf/locales/` (e.g. `fr.json` for French)
    - Use the format from `~/.leaf/locales/en.json` as a template
    - Restart the app — your new language appears in the language picker

Language file format — translation keys are grouped, and a `meta` block describes the language itself:

```json
{
    "meta": {
        "name": "Français", // display name
        "dictationLanguage": "fr" // used for whisper language detection for dictation
    },
    "app": {
        "select_folder": "Sélectionner un dossier"
    }
    // ... more translation groups
}
```

The two `meta` fields:

| Field               | Purpose                                                                                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | How the language is labelled in the picker, written in itself (e.g. `Français`). Falls back to the file name if omitted.                                                                                                                                                                          |
| `dictationLanguage` | The language [dictation](#using-dictation-speech-to-text) transcribes in — a [Whisper language code](https://github.com/openai/whisper#available-models-and-languages) such as `fr`. Leave it `""` if there is no sensible match, and dictation will detect the language from your voice instead. |

For a complete list of translation keys, check `~/.leaf/locales/en.json`.

### Customising the System Prompt

Leaf ships a small library of system-prompt templates as Markdown files. The active prompt is sent to the model on every load / chat reset, shaping its tone and behaviour.

1. Open the AI panel and click the **chat-bubble icon** in the toolbar — the dropdown lists every template in `~/.leaf/prompts/` with its name and description, and a checkmark on the active one.
2. Click any template to make it active.
3. Click the folder icon to edit templates in your preferred editor.

The templates folder lives at `~/.leaf/prompts/`. Each `*.md` file is one template:

```markdown
---
name: Coding Assistant
description: Focused on programming questions, code review, and refactoring
---

You are a senior software engineer assisting inside a note-taking app.
...
```

- The `---` frontmatter block (`name`, `description`) is optional and used only by the picker UI; it's stripped before being sent to the model.
- Drop new `.md` files into the folder to add your own templates — they appear automatically.
- Bundled defaults (`default.md`, `coding.md`, `writing.md`) are seeded on first launch and never overwritten if you've edited them.

### Using Dictation (Speech-to-Text)

Leaf includes a built-in speech-to-text feature powered by [Whisper](https://github.com/openai/whisper) running 100% locally via ONNX:

1. Open any `.txt` or `.md` file in the editor
2. Click the **microphone icon** in the bottom-right corner of the editor
3. On first use, the Whisper model loads from disk (a few seconds)
4. Speak naturally — your speech is transcribed and appended to the file every ~5 seconds
5. Click the microphone again to stop dictation

**Which language it transcribes in.** Dictation follows the language the app is set to, so if the UI is Italian it transcribes Italian. Each locale file declares this via `meta.dictationLanguage` (see [Languages & Localization](#languages--localization)). Guessing the language from a few seconds of audio is unreliable — a bad guess produces gibberish — so it is only used as a fallback, for locales that declare no usable language (custom ones you have written yourself, or languages Whisper does not support, such as Esperanto).

If you speak a different language than your UI is set to, set `meta.dictationLanguage` in that locale file to the language you actually dictate in. For example, keep the app in English but transcribe Italian by putting `"dictationLanguage": "it"` in `~/.leaf/locales/en.json`.

> **The Whisper ONNX model files are not included in this repository.** Before using dictation you need to download them manually — see the [setup step](#speech-to-text-model-setup) below.

#### Speech-to-Text Model Setup

The app uses [`Xenova/whisper-base`](https://huggingface.co/Xenova/whisper-base) from Hugging Face — a multilingual model covering 99 languages. Download the two required quantized ONNX files and place them at the exact paths shown:

```
models/whisper/Xenova/whisper-base/onnx/encoder_model_quantized.onnx
models/whisper/Xenova/whisper-base/onnx/decoder_model_merged_quantized.onnx
```

Download links (right-click → Save Link As):

- [`encoder_model_quantized.onnx`](https://huggingface.co/Xenova/whisper-base/resolve/main/onnx/encoder_model_quantized.onnx)
- [`decoder_model_merged_quantized.onnx`](https://huggingface.co/Xenova/whisper-base/resolve/main/onnx/decoder_model_merged_quantized.onnx)

Or via `curl`:

```sh
mkdir -p models/whisper/Xenova/whisper-base/onnx
curl -L -o models/whisper/Xenova/whisper-base/onnx/encoder_model_quantized.onnx \
  https://huggingface.co/Xenova/whisper-base/resolve/main/onnx/encoder_model_quantized.onnx
curl -L -o models/whisper/Xenova/whisper-base/onnx/decoder_model_merged_quantized.onnx \
  https://huggingface.co/Xenova/whisper-base/resolve/main/onnx/decoder_model_merged_quantized.onnx
```

Once the files are in place, dictation works fully offline — no cloud or API keys needed.

Recommended models for getting started:
| Model Name | Size (Q4_K_M) | System RAM | VRAM (GPU) | Context Window | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Qwen 3.5 4B** | ~2.9 GB | ~4 GB | ~3.5 GB | 256K | **Vision + Text**: Multimodal reasoning |
| **Llama 3.2 3B** | ~2.0 GB | ~4 GB | ~3 GB | 128K | Fast general assistant, robust ecosystem |
| **Qwen 3.5 7B** | ~4.6 GB | ~8 GB | ~6 GB | 128K | **Best All-Rounder**: Superior coding/math |
| **Llama 3.3 8B** | ~5.0 GB | ~8 GB | ~6 GB | 128K | **Best Instruction Following**: Chat, general tasks |
| **Mistral Nemo 12B** | ~7.0 GB | ~12 GB | ~8 GB | 128K | Large context, coding, tool use |
| **Qwen 3.5 14B** | ~9.5 GB | ~16 GB | ~10 GB | 128K | Advanced reasoning, complex analysis |
| **Phi-4 14B** | ~9.8 GB | ~16 GB | ~11 GB | 128K | High-end reasoning, logic puzzles |
| **Gemma 4 9B** | ~6.0 GB | ~12 GB | ~8 GB | 128K | Creative tasks, multimodal (vision/audio) |
| **Qwen 3.8 27B** | ~16.8 GB | ~32 GB | ~17 GB | 262K | **Flagship Local**: Near-api quality, multimodal |
| **Qwen 3.8 32B** | ~20.5 GB | ~32 GB | ~21 GB | 128K | High-performance single-GPU (24GB+ VRAM) |

### App Settings

Leaf stores minimal app preferences (like your last opened folder path) automatically. No configuration needed.

### Conversation History

AI conversations are automatically saved as JSON files in Electron's standard `userData` directory:

- **macOS:** `~/Library/Application Support/Leaf/conversations/`
- **Linux:** `~/.config/Leaf/conversations/`

Each conversation is stored as a separate `.json` file containing the model used, timestamps, and the full message history. Conversations are auto-titled from the first message and can be renamed or deleted from the history panel.

## Getting Started

### Prerequisites

- Node.js (v24+ recommended)
- npm

### Setup

1. **Clone the repository**

```sh
git clone https://github.com/larrydarko1/leaf.git
cd leaf
```

2. **Install dependencies**

```sh
npm install
```

3. **Run in development mode**

```sh
npm run dev
```

### Testing & Code Quality

```sh
# Run all unit tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Lint source code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format source code
npm run format
```

Tests live in the `tests/` directory and mirror the `src/` structure. The CI pipeline runs type-checking, building, and all tests on every push and pull request — the release pipeline only triggers if CI passes.

> **No E2E tests:** Playwright's Electron support remains experimental and broken for Electron 30+ (as of 2026). The --remote-debugging-port flag was removed from the CLI in Electron 30, and the only reliable workaround requires patching your Electron application code via app.commandLine.appendSwitch(). Unit test coverage sits above 80% across all branches and keeps the CI feedback loop fast. E2E support should be revisited once Playwright ships a stable fix for Electron 30+.

### Building for Production

```sh
# Build for your current platform
npm run build:electron

# Build specifically for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

The built installers will be in the `dist-electron/` directory:

- **macOS:** `.dmg` installer
- **Linux:** `.AppImage` file

### Installing the App

After building:

1. Navigate to `dist-electron/`
2. Double-click the installer for your platform
3. Follow installation prompts
4. Launch "Leaf" from your Applications folder

## Tech Stack

- **Desktop:** [Electron](https://www.electronjs.org) (Native macOS and Linux app)
- **Frontend:** [Vue 3](https://vuejs.org), TypeScript, SCSS
- **Editor:** [CodeMirror 6](https://codemirror.net) with [Lezer](https://lezer.codemirror.net) markdown grammar (live preview, inline widgets, keyboard shortcuts)
- **AI:** [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) + [llama.cpp](https://github.com/ggml-org/llama.cpp) (local LLM inference)
- **Speech-to-Text:** [Whisper](https://github.com/openai/whisper) via [@huggingface/transformers](https://github.com/huggingface/transformers.js) + ONNX Runtime (local dictation)
- **Storage:** Plain text files (txt, md), images, videos, audio, and embedded media in your local vault
- **Schema Validation:** [Zod](https://zod.dev) (runtime TypeScript-first schema validation)
- **Build Tools:** [electron-vite](https://electron-vite.org) + [Electron Builder](https://www.electron.build)
- **Testing:** [Vitest](https://vitest.dev) + [Vue Test Utils](https://test-utils.vuejs.org)
- **Linting:** [ESLint](https://eslint.org) (flat config) + [typescript-eslint](https://typescript-eslint.io) + [Prettier](https://prettier.io) + [stylelint](https://stylelint.io/)
- **Git Hooks:** [Husky](https://typicode.github.io/husky) + [lint-staged](https://github.com/lint-staged/lint-staged) + [commitlint](https://commitlint.js.org) (Conventional Commits)

## Project Structure

```
leaf/
├── src/
│   ├── main/                       # Electron main process
│   │   ├── index.ts                # App entry, BrowserWindow, leaf:// protocol, IPC wiring
│   │   ├── lib/
│   │   │   ├── extensions.ts       # Allowed file extension sets for vault scanning
│   │   │   ├── logger.ts           # electron-log wrapper; rotating file logger
│   │   │   ├── mime.ts             # MIME type maps for images, audio, video, PDF
│   │   │   ├── paths.ts            # App path constants: LEAF_HOME, models, prompts, themes, locales
│   │   │   └── validation.ts       # Path-traversal & filename safety checks for IPC
│   │   └── services/
│   │       ├── ai.ts               # Local LLM inference via node-llama-cpp with streaming
│   │       ├── conversation.ts     # Chat conversation persistence as JSON in userData
│   │       ├── fs.ts               # Vault file/folder IPC handlers and FS watcher
│   │       ├── language.ts         # Language/locale management and IPC registration
│   │       ├── media.ts            # Audio recording saves and spellcheck suggestions
│   │       ├── speech.ts           # Local Whisper speech-to-text via ONNX/transformers
│   │       ├── systemPrompt.ts     # System prompt template management and active-prompt state
│   │       └── theme.ts            # Theme preset management and active-theme state
│   ├── preload/
│   │   └── index.ts                # contextBridge: exposes safe IPC APIs to renderer
│   └── renderer/                   # Vue 3 frontend
│       ├── index.html              # Entry HTML
│       ├── main.ts                 # Mounts the Vue app onto #app
│       ├── i18n.ts                 # Vue i18n setup and message loading
│       ├── App.vue                 # Root component: layout, sidebar, tab bar
│       ├── style.scss              # Global SCSS styles and CSS custom properties
│       ├── vite-env.d.ts
│       ├── assets/                 # App icons and images
│       ├── components/
│       │   ├── AiPanel.vue         # AI chat panel orchestrator
│       │   ├── AudioRecorder.vue   # Voice recording and WAV capture UI
│       │   ├── BookmarksPanel.vue  # Bookmarked notes panel
│       │   ├── DrawingCanvas.vue   # Freehand drawing canvas orchestrator
│       │   ├── FileExplorer.vue    # Vault file browser with drag & drop
│       │   ├── NoteEditor.vue      # CodeMirror 6 markdown editor orchestrator
│       │   ├── SearchPanel.vue     # Full-text search across vault
│       │   ├── TabBar.vue          # Editor tab bar
│       │   ├── ThemePicker.vue     # Theme preset picker modal
│       │   ├── ai/                 # AI sub-components
│       │   │   ├── AiHistoryPanel.vue  # Conversation history sidebar
│       │   │   ├── AiInputArea.vue     # Chat input with attached context files
│       │   │   ├── AiMessageList.vue   # Message rendering with streaming
│       │   │   └── AiModelBar.vue      # Model selector and status bar
│       │   ├── drawing/            # Drawing canvas sub-components
│       │   │   ├── DrawingExportDialog.vue  # Export modal with preview & save/copy
│       │   │   ├── DrawingFooter.vue        # Zoom, undo/redo, save status
│       │   │   ├── DrawingPropertiesPanel.vue # Color, stroke & style controls
│       │   │   └── DrawingToolbar.vue       # Tool buttons & architecture shapes
│       │   └── editor/             # Editor & media viewer sub-components
│       │   │   ├── AudioViewer.vue     # Audio player with playback controls
│       │   │   ├── ImageViewer.vue     # Image viewer with zoom
│       │   │   ├── MarkdownToolbar.vue # Markdown formatting toolbar
│       │   │   ├── PdfViewer.vue       # PDF embed viewer
│       │   │   └── VideoViewer.vue     # Video player with custom controls
│       │   └── explorer/             # Editor & media viewer sub-components
│       │       ├── ContextMenu.vue     # Right-click context menu
│       │       └── FolderNode.vue      # Recursive tree node for folder/file rendering
│       ├── composables/            # Vue composables (grouped by domain)
│       │   ├── useAudioRecorder.ts # Microphone capture and WAV encoding
│       │   ├── ai/                 # AI chat, model, history, system prompts
│       │   │   ├── useAIChat.ts        # Streaming inference, message management
│       │   │   ├── useAIModel.ts       # Model loading, unloading, and listing
│       │   │   ├── useConversationHistory.ts  # Conversation persistence and navigation
│       │   │   └── useSystemPrompt.ts  # System prompt template listing and switching
│       │   ├── drawing/            # Canvas rendering, elements, interaction
│       │   │   ├── useCanvasRenderer.ts    # Canvas 2D rendering loop and bitmap export
│       │   │   ├── useDrawingElements.ts   # Shape and path element state management
│       │   │   ├── useDrawingHistory.ts    # Undo/redo stack for drawing operations
│       │   │   ├── useDrawingInteraction.ts # Pointer, wheel, and keyboard event handling
│       │   │   ├── useDrawingPersistence.ts # Save/load drawings; v1→v2 migration
│       │   │   └── useTextEditing.ts       # Inline text tool overlay for canvas
│       │   ├── editor/             # CodeMirror 6 editor & media players
│       │   │   ├── codemirror/         # CodeMirror 6 extension files
│       │   │   │   ├── cm-deco-builders.ts     # Decoration builder functions for live-preview
│       │   │   │   ├── cm-list-continuation.ts # List continuation keymap extension
│       │   │   │   ├── cm-markdown-widgets.ts  # ViewPlugin entry point for markdown live-preview
│       │   │   │   ├── cm-task-fold.ts         # Fold completed tasks extension
│       │   │   │   ├── cm-theme.ts             # Editor theme and syntax highlight styling
│       │   │   │   ├── cm-toolbar.ts           # Toolbar formatting commands & keybindings
│       │   │   │   ├── cm-widgets.ts           # WidgetType classes for live-preview
│       │   │   │   ├── useCodeEditor.ts        # CM6 instance for read-only code file viewing
│       │   │   │   └── useCodemirror.ts        # CM6 markdown editor lifecycle and extensions
│       │   │   ├── useAudioPlayer.ts       # Reactive audio playback state and controls
│       │   │   ├── useDictation.ts         # Streams mic audio to Whisper, inserts transcription
│       │   │   ├── useEditorDrop.ts        # Drag & drop onto editor inserts embed syntax
│       │   │   ├── useEditorTabs.ts        # Open file tabs with localStorage persistence
│       │   │   ├── useEmbedResolver.ts     # Resolves ![[...]] paths to data URIs with caching
│       │   │   ├── useNotePersistence.ts   # Note content load/save and auto-save scheduling
│       │   │   └── useVideoPlayer.ts       # Reactive video playback state and controls
│       │   ├── ui/                 # General UI composables
│       │   │   ├── useContextMenu.ts           # Context menu position and open/close state
│       │   │   ├── useLanguage.ts              # Language listing and switching; calls IPC service
│       │   │   ├── useListKeyboardNavigation.ts # Arrow-key navigation for list elements
│       │   │   └── useTheme.ts                 # Theme listing, CSS property application
│       │   └── vault/              # Vault & file management
│       │       ├── useBookmarks.ts     # Bookmarked notes state
│       │       ├── useFileSelection.ts # Active file and multi-select state
│       │       ├── useFolderTree.ts    # Recursive tree structure from flat file/folder lists
│       │       ├── useTreeNodeDrag.ts  # Drag-and-drop file/folder moves in tree
│       │       └── useVault.ts         # Core vault: folder open, FS watcher, CRUD
│       └── utils/                  # Shared utilities
│           ├── audio.ts            # WebM→WAV conversion and PCM encoding helpers
│           └── fileTypes.ts        # File extension classification constants and predicates
├── src/schemas/                    # Zod validation schemas (centralized types)
│   ├── ai.ts                       # AI model info, load result, and status schemas
│   ├── chat.ts                     # Chat message schema
│   ├── drawing.ts                  # Drawing element, tool, and canvas schemas
│   ├── electron.d.ts               # Electron IPC & preload API type declarations
│   ├── speech.ts                   # Speech-to-text result schemas
│   └── vault.ts                    # Vault tree node, file, and folder schemas
├── tests/                          # Mirrors src/ structure (unit tests)
│   ├── main/
│   │   └── ... (mirrors src/main/)
│   ├── renderer/
│   │   └── ... (mirrors src/renderer/)
│   └── schemas/
│       └── ... (mirrors src/schemas/)
├── assets/                         # Bundled app assets seeded to LEAF_HOME on first launch
│   ├── locales/                    # Default language translations (JSON)
│   │   ├── en.json
│   │   ├── it.json
│   │   └── ...
│   ├── prompts/                    # Default system prompt templates (Markdown)
│   │   ├── coding.md
│   │   ├── default.md
│   │   └── writing.md
│   └── themes/                     # Built-in colour themes (JSON)
│       ├── dark.json
│       ├── light.json
│       └── ...                     # 18 themes total (catppuccin, dracula, nord, etc.)
├── models/
│   └── whisper/                    # Whisper ONNX model (download manually — see above)
├── public/                         # Static assets (demo screenshot)
├── build/                          # Packaging inputs: master icon, DMG backgrounds, hooks
├── design/                         # Source design files (PSD, SVG)
├── scripts/
│   └── check/                      # CI gate scripts
│       └── check-audit.mjs         # npm audit gate with a reviewed advisory allowlist
├── .github/
│   ├── CONTRIBUTING.md             # Contributor guide (setup, testing, releases)
│   ├── SECURITY.md                 # Vulnerability reporting policy
│   ├── CODE_OF_CONDUCT.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/             # Bug report & feature request forms
│   ├── FUNDING.yml                 # GitHub Sponsors config
│   ├── dependabot.yml              # Monthly npm & Actions update PRs
│   ├── actions/                    # Composite actions (node setup, Whisper model)
│   └── workflows/
│       ├── ci.yml                  # Audit, lint, type-check, build, test on every push/PR
│       ├── pr-title.yml            # Conventional-commit check on PR titles
│       └── release.yml             # macOS & Linux build & GitHub Release
├── electron.vite.config.ts         # electron-vite config (main, preload, renderer)
├── vitest.config.ts                # Test runner config (jsdom environment)
├── eslint.config.js                # ESLint flat config (TypeScript + Vue + Prettier)
├── commitlint.config.js            # Conventional Commits linting
├── .prettierrc                     # Prettier formatting rules
├── package.json
├── tsconfig.json                   # Root TS config (project references)
├── tsconfig.app.json               # Renderer TS config (DOM + Vue, strict)
└── tsconfig.node.json              # Main & preload TS config (Node, strict)
```

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines. Security issues go by email to
<hello@larrydarko.dev>, never a public issue — see [SECURITY.md](.github/SECURITY.md).

## License

Versions prior to v2.0.0 are licensed under the [MIT License](https://opensource.org/licenses/MIT).

From v2.0.0 onward, this project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE). You are free to use, modify, and distribute this software under the terms of the AGPL-3.0. If you wish to use Leaf in a proprietary or commercial product without complying with the AGPL, please contact the author for a commercial license.

## Acknowledgments

- Inspired by [Obsidian](https://obsidian.md/) for the vault-based note-taking approach
- Local AI powered by [llama.cpp](https://github.com/ggml-org/llama.cpp) and [node-llama-cpp](https://github.com/withcatai/node-llama-cpp)
