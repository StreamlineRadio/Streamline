# AGENTS.md - Streamline

AI agent guidance for working in this repository. Read this before writing or editing code.

---

## What is Streamline?

A free, open-source, cross-platform radio broadcasting application. Think of it as a lightweight SAM Broadcaster: DJs can stream live audio to Icecast/Shoutcast servers, monitor what listeners hear in real time, and manage multiple decks + queue from a draggable module-based UI.

**Full spec:** [`GENERAL_IDEA.md`](./GENERAL_IDEA.md). That document is the source of truth for decisions, architecture, and scope. When in doubt, read it first.

---

## Monorepo Layout

```
streamline/
├── packages/
│   ├── ui/              SvelteKit 5 (Svelte 5 + runes), adapter-static, renderer process UI
│   ├── electron/        Electron main process: window mgmt, encoding, streaming, SQLite DB
│   ├── shared/          Shared types, IPC channel definitions, module contracts
│   ├── modules/         Built-in modules: deck, queue, crossfader, mic, encoders, local-output, mixer
│   └── audio-worklet/   AudioWorklet processors (compiled separately)
├── plugins/             Example/test third-party plugins
├── scripts/             Build, package, release scripts
├── GENERAL_IDEA.md      Full product spec - source of truth
└── AGENTS.md            This file
```

**Package manager:** pnpm workspaces. Always use `pnpm`, never `npm` or `yarn`.

---

## Tech Stack

| Layer               | Technology                                               |
|---------------------|----------------------------------------------------------|
| UI framework        | Svelte 5 (runes API), SvelteKit in adapter-static mode   |
| Desktop shell       | Electron (renderer sandboxed, contextIsolation: true)    |
| Styling             | Tailwind CSS 4                                           |
| i18n                | Paraglide JS (inlang)                                    |
| Database            | SQLite via better-sqlite3, ORM: Drizzle                  |
| Audio encoding      | FFmpeg (via `ffmpeg-static`, spawned as child process)   |
| Testing             | Vitest (unit), Playwright (integration/e2e)              |
| Build orchestration | pnpm workspaces (Turborepo is the target, not yet wired) |

---

## Dev / Build Flow

### Development (`pnpm dev`)

1. `pnpm --parallel` starts both the SvelteKit dev server (`packages/ui`) and the Electron `dev` script simultaneously.
2. The Electron `dev` script runs `wait-on tcp:5173` before launching Electron Forge, so Electron only starts once the SvelteKit server is ready.
3. The main process detects `!app.isPackaged` and loads `http://localhost:5173`.
4. SvelteKit hot-module replacement works normally; changing Electron main/preload restarts the process.

### Production (`pnpm package`)

1. `pnpm build` runs `vite build` in `packages/ui` → static files output to `packages/ui/build/`.
2. `electron-forge make` triggers the `generateAssets` hook which copies `packages/ui/build/` → `packages/electron/renderer/`.
3. Forge packs the app (including `renderer/`) into an ASAR archive and wraps it in platform installers.
4. Output lands in `packages/electron/out/`.

The `packages/electron/renderer/` directory is gitignored - it is always generated from `packages/ui/build/` at package time.

---

## Architecture - Critical Rules

### Audio Pipeline

The flow is: **Renderer (Web Audio API) → Main process (encode) → Stream/file**.

1. All audio mixing happens in an `AudioWorkletProcessor` inside the renderer. The master `AudioContext` is always `{ sampleRate: 48000, latencyHint: 'interactive' }` - never change this default.
2. PCM is transferred renderer→main via `MessageChannelMain` as `Transferable ArrayBuffer`s (zero-copy). Do **not** use `ipcRenderer.send` for audio data.
3. FFmpeg handles all encoding. Each encoder is a separate `child_process.spawn('ffmpeg', ...)` child. PCM (`f32le`, stereo, 48 kHz) goes to `stdin`; encoded bytes come from `stdout`.
4. Output sample rate varies per encoder config; FFmpeg resamples via `-ar <rate>`. The internal graph always stays at 48 kHz.

### Electron Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` in all renderer windows - do not relax these.
- All filesystem, DB, and network access lives in the **main process**. Renderer communicates via an explicit typed IPC layer in `packages/shared`.
- Stream passwords are encrypted with `safeStorage` (`encryptStringAsync`/`decryptStringAsync`). The renderer **never** sees plaintext passwords. Store ciphertext in the `secrets` SQLite table; reference by key in `encoder_configs.passwordRef`.

### IPC

Two channels:

1. **Control plane** - typed request/response + pub/sub for everything non-audio. Use `ipcMain.handle` with a typed wrapper (or `electron-trpc`). Methods are defined in `packages/shared`.
2. **Audio data plane** - `MessageChannelMain` port handed to the renderer at startup. `ArrayBuffer` transfers only.

### Module System

Every UI feature is a **module**. Modules come in two kinds:

- `window` - a draggable, resizable window in the layout (deck, queue, crossfader, etc.)
- `headless` - no UI; runs in the background (a noise-gate insert, an OBS bridge, etc.)

Every module must implement the `ModuleManifest` interface from `packages/shared/src/module-contract.ts`. Key fields: `id`, `kind`, `singleton`, `produces`, `consumes`, `exposes`, `publishes`.

Audio routing in the MVP is **fixed and implicit**: every module that `produces: ['audio']` connects to the master mixer bus. Do not build a configurable audio graph for the MVP.

---

## Database Schema

Tables (defined in the main process via Drizzle + better-sqlite3):

| Table              | Purpose                                                          |
|--------------------|------------------------------------------------------------------|
| `songs`            | Global music library; keyed by `hash(path + size + mtime)`       |
| `layouts`          | Named window arrangements                                        |
| `module_instances` | Windows in the active layout (position, size, z-index, settings) |
| `encoder_configs`  | Encoder definitions (format, target server/file, bitrate, etc.)  |
| `queue_items`      | Persisted queue contents per queue instance                      |
| `hotkeys`          | Key bindings per module instance                                 |
| `secrets`          | Encrypted password blobs (`safeStorage`)                         |
| `settings`         | Global key/value store                                           |

Full schema is in `GENERAL_IDEA.md § Data & Persistence`.

---

## MVP Scope - What Is and Isn't In

**In scope:**
- Deck, Queue, Crossfader, Microphone, Encoders, Local Output, Mixer modules
- MP3, AAC (native), Ogg Vorbis, Opus, FLAC encoding via bundled LGPL FFmpeg
- Icecast 2 streaming (HTTP PUT), Shoutcast 2 via `nodeshout`, file output
- SQLite-backed persistence (library, layouts, queues, hotkeys, secrets)
- Draggable, resizable module windows via `interact.js`
- Dark/light theme via CSS variables; dark default
- Multiple named layouts; import/export (strips secrets on export)
- First-run default layout (Deck A, Deck B, Aux Deck, Queue, Crossfader, Mic, Encoders, Local Output)
- Per-instance hotkeys; configurable from a hotkeys panel
- Status bar: master level, encoder state, CPU, clock
- "On air" indicator when at least one encoder streams

**Not in scope for MVP (do not implement):**
- Beat matching, BPM analysis, auto-mix
- Cloud / remote song sources
- Video, visual effects
- Mobile clients
- Auto-update
- OS-global hotkeys
- Plugin sandboxing / capability system
- Plugin registry / hot reload
- User-configurable audio routing graph
- Cart wall, voice tracking, now-playing web view, history log

---

## Coding Standards & Patterns

### Formatting

Enforced by Prettier. Run `pnpm format` (in `packages/ui`) before committing. The config lives at `packages/ui/.prettierrc`:

- **Indentation:** tabs, not spaces
- **Quotes:** single quotes
- **Trailing commas:** none
- **Print width:** 100 characters
- **Svelte files:** parsed by `prettier-plugin-svelte`; Tailwind classes sorted by `prettier-plugin-tailwindcss`

The Electron package does not yet have its own Prettier config - follow the same rules there for consistency.

### TypeScript

- TypeScript in every `.ts`, `.svelte` (`lang="ts"`), and `.svelte.ts` file. No plain JS files in new code.
- No `any`. If a type is genuinely unknown, use `unknown` and narrow it.
- Use the `node:` protocol for all Node built-in imports:
  ```ts
  import path from 'node:path';
  import fs from 'node:fs/promises';
  ```
- **`packages/ui`** targets ESNext modules (bundled by Vite).
- **`packages/electron`** targets CommonJS (`"module": "commonjs"` in tsconfig) because Electron's main process runs in Node.js. Do not use top-level `await` or ESM-only patterns there unless Electron's Node version supports them.
- `noImplicitAny: true` is set in the electron tsconfig; treat it as the project-wide baseline.
- `skipLibCheck: true` is set - do not remove it; third-party `.d.ts` files are not our responsibility.

### Svelte 5

Runes mode is **globally enforced** via `svelte.config.js` `compilerOptions.runes: true`. The legacy Options API will cause a compile error.

**Props:**
```svelte
<script lang="ts">
  let { title, count = 0 }: { title: string; count?: number } = $props();
</script>
```

**Reactive state:**
```svelte
<script lang="ts">
  let volume = $state(1.0);
  let label = $derived(volume === 0 ? 'Muted' : `${Math.round(volume * 100)}%`);
</script>
```

**Side effects:**
```svelte
<script lang="ts">
  $effect(() => {
    gainNode.gain.value = volume;
  });
</script>
```

**Slot content (snippets):**
```svelte
let { children } = $props();
{@render children()}
```

**Events:** use plain DOM event attributes, not `on:event` directives:
```svelte
<button onclick={() => play()}>Play</button>
```

**Never use:**
- `export let` (use `$props()`)
- `$:` reactive statements (use `$derived` / `$effect`)
- `on:event` directives (use `onclick`, `oninput`, etc.)
- `<slot>` (use snippet `{@render children()}`)
- `createEventDispatcher` (use callback props)

### Electron Main Process Patterns

Top-level functions are written as `const` arrow functions:
```ts
const createWindow = () => {
  const mainWindow = new BrowserWindow({ ... });
  ...
};

app.whenReady().then(createWindow);
```

IPC handlers use `ipcMain.handle` (async, returns a value) or `ipcMain.on` (fire-and-forget). Always type the return value:
```ts
ipcMain.handle('library:search', async (_event, query: string): Promise<Song[]> => {
  return db.searchSongs(query);
});
```

Preload scripts expose only a narrow, explicit API via `contextBridge.exposeInMainWorld`. Never expose the entire `ipcRenderer` object.

### Styling

- **Tailwind CSS 4** utility classes are the primary styling mechanism. Keep layout, spacing, and color in class attributes.
- **CSS variables** for all theme-sensitive values (colors, shadows). This is how plugins can theme correctly. Define custom properties at `:root` in `layout.css`.
- Dark theme is the default. Use Tailwind's `dark:` variant or CSS `@media (prefers-color-scheme: dark)` for light-mode overrides.
- Avoid inline `style=` attributes except for dynamic values that cannot be expressed as Tailwind classes (e.g., calculated `transform: translateX(${pos}px)`).

### Color usage

- Use `-500` shades for fills, buttons, and accents - not for text on white (most fail 4.5:1 contrast).
- For body text on white, use `-600` or `-700` of any color.
- For `warning` text, always use `-700` or `-800` (amber has the worst contrast).
- Prefer `secondary-600` (#A4654A) over `secondary-500` when a more refined "cognac" tone is desired.

### ESLint

Both packages use `@typescript-eslint/recommended`. The UI additionally uses `eslint-plugin-svelte`. Key rules:

- `no-undef` is **off** in the UI - TypeScript handles undefined identifiers.
- The Electron package enforces `eslint-plugin-import/electron` - keep main/renderer import boundaries clean.
- Do not suppress lint errors with `// eslint-disable` unless there is no other option; prefer fixing the root cause.

Run lint: `pnpm lint` (UI). Fix auto-fixable issues: `pnpm lint --fix`.

### General

- **No comments by default.** Only add a comment when the *why* is non-obvious (a hidden constraint, a workaround for a specific bug, a subtle invariant). Don't describe what the code does; names do that.
- **No speculative abstractions.** Implement exactly what the task requires. Three similar lines is better than a premature helper. We can abstract later if needed.
- **No dead code.** Delete unused variables, functions, and imports outright. Do not rename to `_unused` or leave `// removed` comments.
- **No error handling for impossible cases.** Trust TypeScript and framework guarantees. Validate only at real boundaries (user input, IPC calls, file system results).
- **Secrets never touch the renderer.** Any code path involving plaintext passwords lives exclusively in the main process.
- **FFmpeg:** always use the bundled binary extracted to `<userData>/bin/ffmpeg`, SHA-256 verified. Never invoke the system `ffmpeg` command. Do not bundle `libfdk_aac`.

### MCP

- Use the Svelte MCP for svelte actions and documentation
- Use context7 to check documentation for all used packages and API when needed.
- ALWAYS use token-saviour to save on tokens.

---

## Common Commands

```bash
# Install all workspace deps
pnpm install

# Start full dev environment (UI + Electron)
pnpm dev

# Build UI only (outputs to packages/ui/build/)
pnpm build

# Package app for current platform (builds UI then runs electron-forge make)
pnpm package

# Type-check all packages
pnpm check

# Run unit tests
pnpm test

# --- Per-package ---

# Run UI dev server only
pnpm --filter streamline-ui dev

# Run Electron only (assumes UI dev server is already running on :5173)
pnpm --filter streamline-electron start

# Type-check UI
cd packages/ui && pnpm check

# Lint UI
cd packages/ui && pnpm lint

# Run unit tests
cd packages/ui && pnpm test:unit
```
