# The General Idea of Streamline.

A (light) SAM Broadcaster that's free, open source, has a plugin system and is cross-platform. The main goal is to let DJs stream radioshows to a Shoutcast or Icecast server (or directly to a file) while hearing themselves what they are playing live.

## Goals & Non-Goals

**Goals (MVP):**
- Stream live radio to Icecast/Shoutcast servers in MP3 (and at least one other modern format).
- Let the DJ monitor what listeners hear, in real time, with low latency.
- Provide a draggable, multi-deck UI similar in spirit to SAM Broadcaster.
- Be extensible via a documented plugin/module system.
- Run on Windows, macOS, and Linux from a single codebase.

**Non-goals (MVP):**
- Beat matching, key detection, BPM analysis, or auto-mixing - out of scope.
- Cloud library / remote song sources - local files only.
- Visual effects, video streaming, recording video.
- Mobile clients.

## Notes

- Sometimes there is a UI from something too obvious to implement that I've left out the implementation details. Just implement them as well.

---

## Licensing

**Dual license: AGPLv3 (default) + commercial license (paid).**

- The AGPLv3 default ensures any derivative work - including a hosted SaaS variant - must release source under AGPLv3. This is the strongest copyleft choice and fits an open-source DJ tool that the project owner wants to keep open.
- A separate **commercial license** is offered for users who can't or don't want to comply with AGPLv3. Three concrete cases this covers:
  1. Plugin authors who want to ship proprietary, closed-source plugins.
  2. Radio stations or businesses that don't want to release their internal modifications.
  3. OEMs / appliance vendors bundling Streamline into a product.
- **Contributor License Agreement (CLA)** is required for all external contributions. Without a CLA the project owner can't legally relicense contributions under the commercial terms. Recommendation: use the **Developer Certificate of Origin (DCO)** with an explicit relicensing-grant clause, or a CLA Assistant flow on GitHub. (DCO is lower-friction; full CLA is more defensible.)
- **Plugin license clarity** - a `LICENSE.md` at the project root spells out the legal model for plugin authors:
  - Plugins distributed *separately* from the host that interact only via the documented module API are treated as separate works (not derivatives).
  - Plugins that fork the host source, statically link host internals, or bundle Streamline modules are derivatives and must comply with AGPLv3 (or obtain a commercial license).
  - Plugin authors who want to ship a proprietary plugin and avoid this ambiguity entirely can purchase a commercial license.
- **FFmpeg implications:** AGPLv3 is compatible with LGPL components in FFmpeg's default build. GPL-only FFmpeg components (e.g. `libx264`) and non-redistributable components (e.g. `libfdk_aac`) are *not* bundled - see [Encoding](#encoding-detail).

---

## Project Structure

A pnpm-based monorepo. (pnpm is preferred over npm/yarn for speed and disk efficiency.)

```
streamline/
├── packages/
│   ├── streamline/      Electron main process + plain Svelte renderer (Vite). Single package.
│   ├── shared/          Types, IPC channel definitions, module contract types.
│   ├── modules/         Built-in modules (deck, queue, microphone, encoders, local-output, mixer, crossfader).
│   └── audio-worklet/   AudioWorklet processors compiled separately (they run in their own context).
├── plugins/             Example third-party plugins for testing the plugin loader.
├── scripts/             Build, package, release scripts.
└── package.json
```

**Build flow:** `pnpm --filter streamline make` runs Electron Forge, which compiles the Svelte renderer and Electron main/preload via Vite, then packages the result for each OS via the configured makers (Squirrel/DMG/AppImage/deb/rpm). Native modules (better-sqlite3, etc.) must be rebuilt against Electron's Node ABI — Forge handles this via `electron-rebuild`.

---

## The MVP

### Application Shell

There's a desktop application: the `streamline` package contains the Electron main process and a plain Svelte renderer, both compiled by Electron Forge's VitePlugin. Building the project means running `electron-forge make`, which compiles everything in one step.

- The renderer is a plain **Svelte 5** app (runes) built by Vite. No SvelteKit — the app has no routing needs and settings are popups.
- In dev, Electron Forge's VitePlugin starts a Vite dev server and injects the URL into the main process. In production, the renderer is bundled into the asar and loaded via `file://` (plain Vite emits relative asset paths, so no custom protocol is needed).
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` for the renderer. All privileged work crosses an explicit IPC boundary.

### Audio Architecture

The main audio architecture is based on **"Mix in Renderer (AudioWorklet), Encode in Main, Stream in Main"**:

1. **Sound generation (renderer).** Sound is generated from the UI (e.g. by playing a track, opening the microphone or by using a plugin) and uses a Web Audio API context. There are multiple nodes that can produce audio; those need to be mixed together and sent to the main process.

   - **Master `AudioContext` is constructed with `{ sampleRate: 48000, latencyHint: 'interactive' }`.** The default (hardware-rate) AudioContext varies per machine, often opens at 44.1 kHz on Windows and 48 kHz elsewhere, and would force per-source resampling math we don't want. Forcing 48 kHz at the context level means the browser's audio engine resamples once on the way in/out instead of us doing it everywhere.
   - Sample format inside the renderer: 32-bit float, stereo, interleaved L/R, 48 kHz.
   - Buffer size: **128 samples per render quantum** (the AudioWorklet default). Larger buffers add latency; smaller risks underruns.
   - The mixer module owns the master `AudioContext` and a `GainNode` master bus. Every audio-producing module connects its output to this bus.
   - A custom `AudioWorkletProcessor` ("tap worklet") is connected after the master bus. It does not alter the audio; it copies each render quantum into a pre-allocated `Float32Array` ring buffer and posts batches over a `MessagePort` to the main process.

2. **Renderer→Main transfer.** Use `MessagePort` - specifically Electron's `MessageChannelMain` - to establish a direct renderer ↔ main port that bypasses the default IPC's JSON serialization. Send PCM as `Transferable` `ArrayBuffer`s (zero-copy ownership transfer). Use an AudioWorklet (not a Web Worker) to do the mixing - Web Workers aren't synchronized to the audio clock and would glitch under load.

   - Batches of ~10–20 ms of audio (480–960 frames at 48 kHz) are posted at a time to balance throughput vs. latency.
   - Backpressure: if the main process can't keep up (e.g. encoder stalled, network slow), the ring buffer overwrites oldest frames and posts a "dropout" event so the UI can show a warning.

3. **Encoding (main).** Use a bundled FFmpeg binary for encoding. Each encoder is a child `ffmpeg` process: raw PCM (48 kHz, stereo, f32le) goes into stdin, encoded bytes come out of stdout.

   - **Output sample rate is per-encoder** (decided at encoder config time). The encoder process resamples on the way out via FFmpeg's `-ar <rate>` flag. Internally the audio graph stays at 48 kHz; only the encoded output may differ. Supported output rates: 22050, 32000, 44100, 48000.
   - Channels and bitrate are likewise per-encoder.

4. **Streaming (main).** Each encoder process's stdout is piped into a streaming client.

   - **Icecast 2:** HTTP `PUT` to `http://server:port/mount.mp3` with `Authorization: Basic ...` and `Content-Type` per format. Send metadata updates via separate `GET /admin/metadata?mode=updinfo&mount=...&song=...`.
   - **Shoutcast 2:** uses the SOURCE protocol (a non-standard HTTP variant on a port one above the listen port). Library option: `nodeshout` (libshout bindings) which abstracts both Icecast and Shoutcast.
   - **File output:** just pipe stdout to a `fs.createWriteStream`. Filename pattern configurable, with placeholders like `{date}`, `{time}`, `{format}`.
   - Reconnect logic: on connection drop, retry with exponential backoff (1s, 2s, 4s, max 30s). Surface status to the UI.
   - Throttling: when streaming, audio is fed at real-time rate (it has to be - the server expects 1 second of audio per second). When writing to file, no throttling needed.

### Module System

The UI consists of modules - think of them as plugins. Every module can have its own UI, can produce audio, can expose data to other modules and can receive data from other modules. This way, other people can build plugins for the application without needing to have them pulled into the code. Keep in mind we want to, eventually, make a manifest + registry with a typed contract.

```ts
// packages/shared/src/module-contract.ts
export interface ModuleManifest {
  id: string;                                  // e.g. "deck", "com.alice.jingle-cart"
  displayName: string;                         // e.g. "Deck"
  version: string;                             // semver
  hostApi: string;                             // semver range of compatible host API, e.g. "^1.0.0"
  kind: 'window' | 'headless';                 // window = draggable UI, headless = no UI
  singleton: boolean;                          // true => only one instance allowed
  produces: AudioCapability[];                 // ['audio'] if it outputs sound
  consumes: AudioCapability[];                 // ['audio'] if it accepts a stream input
  exposes: Record<string, MethodSpec>;         // RPC-style methods other modules can call
  publishes: Record<string, StateSpec>;        // reactive state others can subscribe to
  subscribes: string[];                        // module-ids whose state this module reads
  ui?: SvelteComponent;                        // required when kind === 'window', forbidden when 'headless'
  settingsUi?: SvelteComponent;                // a small UI for the global Plugins panel (used by both kinds)
  init?: (ctx: ModuleContext) => Promise<void>;
  destroy?: (ctx: ModuleContext) => Promise<void>;
}
```

- **Plugin kinds:** `window` plugins render as a draggable window in the layout (decks, queues, etc.). `headless` plugins have no window - they sit in the background and produce/consume audio or expose state. They're managed from a global "Plugins" panel where the user can enable/disable, configure (via `settingsUi`), and see status. Examples that fit `headless`, but are not for the MVP: a noise-gate module inserted between the mic and the master bus, an external-API "now playing" reporter, an OBS WebSocket bridge.
- **Inter-module communication:** a typed event bus + reactive store (built on Svelte stores). Modules publish state under `module.<instanceId>.<key>`; others subscribe by path. RPC-style method calls go through a typed dispatcher that validates against the target's `exposes` map.
- **Audio routing:** for the MVP, routing is **fixed and implicit** - every module that `produces: ['audio']` connects to the master mixer bus; consumers that take the mixer output (encoders, local output) subscribe to it explicitly. A user-configurable audio graph is post-MVP and called out under [Roadmap](#roadmap).
- **Loading model (MVP):** built-in modules are statically imported from `packages/modules`. Third-party plugins are loaded from a known plugins folder (`<userData>/plugins/`) at startup. Each plugin is a folder with `manifest.json` + a bundled JS file (compiled Svelte). Hot-reload is post-MVP.
- **External plugin distribution:** external (third-party) plugins are **not compiled into the application**. Plugin authors distribute their plugin as a folder (containing `manifest.json` + bundled JS) and users install it manually by dropping it into `<userData>/plugins/`. There is no in-app plugin store or registry — users find and install plugins out-of-band (e.g. from a GitHub release or a website). The app simply scans the plugins folder at startup and loads whatever it finds. A plugin registry / in-app browser is on the roadmap but not coming soon.
- **Sandboxing (MVP):** none beyond Electron's renderer sandbox. Plugins run with the same privileges as built-in modules. This is acceptable for a self-installed open-source DJ tool but should be documented prominently. A capability-based sandbox is on the roadmap.
- **Versioning:** the host exposes a host API version (semver). Plugins declare a compatible range in their manifest (`hostApi`). Mismatches log a warning and skip loading.

### Window Management

All `window`-kind modules are Svelte components and have a draggable UI. The main application window is a screen with these modules as draggable windows. This way you can have multiple modules on the screen at the same time. Also, you can have multiple of the same modules on the screen at the same time (e.g. 4 decks). Use a thin custom window manager on top of **`interact.js`** for the drag/resize primitives. These windows can be resized and their titles can be renamed (but the name of the module will always be visible - e.g. for a Deck it will be "Deck: Custom Title").

Window state to persist per instance: `{ instanceId, moduleId, x, y, width, height, zIndex, title, minimized, customSettings }`. Custom settings are module-defined (e.g. a Deck remembers its "accepts from queue" choice).

This also means that all window modules need to be responsive, as they can be resized by the user.

### MVP Modules

#### Deck
A module that can play tracks.
- **UI:** Title of the song, cover of the song, playback information (length, current position), play/pause button, volume slider, fade-out button, seekbar, live dB meter.
  - **Seekbar:** shows the waveform of the song playing, generated in the background, placeholder while generating. Use `wavesurfer.js` for rendering the waveform, but compute peaks ourselves in a Web Worker (decode via `OfflineAudioContext`, downsample to ~1 peak per pixel) and cache to disk keyed by file content hash. This avoids re-decoding on every load and stays fast for long tracks.
  - **dB meter:** computed from the deck's output `AnalyserNode`, RMS over a 50ms window, displayed as peak + sustained level with red clip indicator at 0 dBFS.
- **Settings menu:**
  1. Accepts from queue (select: which queue module this deck accepts automatic playing songs from, or "none").
  2. Send metadata (toggle: controls if the song metadata is sent to the streaming server).
  3. Auto-fade-out duration (number, default 5s) - used by the fade-out button and the queue's auto-advance.
- **Drag-drop:** accepts a song from the file explorer or from another module to load it. (Accepted MIME types / extensions are documented under [Supported Audio Formats](#supported-audio-formats).)
- **Outputs:** the audio data from the playing track to the mixer.
- **Exposes:** the song info and playback information for other modules.
- **Exposes functions:** `loadSong(path)`, `play()`, `pause()`, `seek(seconds)`, `setVolume(0-1)`, `fadeOut(durationMs)`, plus reactive state `{ currentSong, position, duration, isPlaying, level }`.

#### Queue
A module that can hold a queue of songs. It can automatically send songs to a deck to play them.
- **UI:** Add button, remove button, push to deck button, autoplay toggle, list of songs (drag to reorder, drag to a deck to load).
- **Exposes:** the queue as an array of songs.
- **Exposes functions** tied to the UI elements for other modules to use (`add`, `remove`, `move`, `clear`, `pushToDeck(deckId)`).
- When autoplay is on, automatically sends the next song in the queue to the next deck to play it if the current deck is done playing.
- **Auto-advance rotation algorithm:**
  1. Each deck individually opts into a queue via its "Accepts from queue" setting. The queue maintains a list of opted-in deck instance IDs.
  2. When a deck currently playing a song from this queue nears its end (current position >= duration - auto-fade-out duration), the queue picks the next deck in rotation order and pushes the next queue item to it.
  3. **Rotation order = z-index order at the time of selection.** The deck with the lowest z-index that isn't currently playing a queue-sourced track gets the next song. If all opted-in decks are playing, the queue waits.
  4. The crossfader (if present and bound to the two decks involved) automates the fade between them - see [Crossfader](#crossfader).
- Must be able to add a folder of songs (recursive scan; ignores files that don't pass format detection).
- **Persistence:** a queue's contents persist across restarts (stored in `queue_items`).

#### Crossfader
A module that automates volume blending between two decks.
- **UI:** A horizontal slider from -1 (full A) through 0 (both equal) to +1 (full B), two deck selectors (left = A, right = B), a curve selector, a "Crossfade now" button, a duration field (default 4s), and an "Auto-fade on track end" toggle.
- **Curves:** `linear`, `equal-power` (constant total perceived loudness - usually best for music mixing, recommended default), `cut` (one or the other, no overlap - useful for talk-radio-style switches).
- **How it works:** the crossfader does **not** route audio. It simply sets the gain of the two bound decks. Decks still connect to the master bus directly; the crossfader only manipulates each deck's `volume` parameter on every animation frame during a transition. This keeps the audio graph in line with the "fixed and implicit" routing model and avoids special-casing.
- **Manual operation:** dragging the slider live-updates both deck gains. Pressing "Crossfade now" animates the slider from its current position to the opposite end over the configured duration.
- **Auto operation:** when "Auto-fade on track end" is on and a deck bound to this crossfader is the *currently dominant* one (slider is on its side) and reaches `duration - crossfadeDurationSec`, the crossfader animates to the other side. Coordinates with the Queue: if the other deck is empty at that moment, the queue is asked to push the next song first.
- **Exposes:** `setPosition(-1..+1)`, `crossfadeNow()`, plus reactive state `{ position, isAnimating, leftDeckId, rightDeckId }`.
- **Multiple crossfaders** are allowed - e.g. a 4-deck setup with two crossfader pairs (A↔B and C↔D) is valid.

#### Microphone
A module that can capture the microphone input and send it to the mixer.
- **UI:** Push to talk button, lock talk button, volume control and a live dB meter.
- Uses `getUserMedia({ audio: true })` with `echoCancellation: false, noiseSuppression: false, autoGainControl: false` - a DJ wants the raw signal, not a phone-call-optimized one.
- Input device selector (a system can have multiple mics; default to system default, allow override). Expose chosen device id in module settings.
- Push-to-talk: while the bound key is held, the mic gain ramps up (~10ms); on release, ramps down (~50ms) to avoid clicks.

#### Encoders
A module that takes in the audio data from the mixer and sends it to the main process and controls where the main process is sending them.
- **UI:** Add encoder button, remove encoder button, table of the encoders showing format, bitrate, quality, amount of audio (time and size) encoded and streamed, start/stop toggle button.
- When encoders are turned on, call a function in the main process to start a process to encode the audio from the mixer and send it to a file or server, depending on the encoder settings.
- To make it more pluggable, the main process receives a config (like server, password, format etc. or filepath), creates a UUID for that process, and with that UUID information can be pulled from the main process about the encoding and streaming process (like how much audio is encoded and streamed, the status of the process, etc.) and also the process can be stopped by sending a stop command with the UUID to the main process.
- Adding/editing encoders should be a modal with a save button.
- **Encoder config schema:**
  ```ts
  type EncoderConfig = {
    id: string;                                          // uuid
    name: string;                                        // user-visible label
    type: 'icecast' | 'shoutcast' | 'file';
    format: 'mp3' | 'aac' | 'ogg-vorbis' | 'opus' | 'flac';
    bitrateKbps: number;                                 // ignored for flac
    sampleRate: 22050 | 32000 | 44100 | 48000;           // output rate; FFmpeg resamples from internal 48 kHz
    channels: 1 | 2;
    // network only:
    host?: string; port?: number; mount?: string;
    username?: string;                                   // icecast usually 'source'
    passwordRef?: string;                                // safeStorage key, NOT the password itself
    publicListing?: boolean;
    streamName?: string; description?: string; genre?: string; url?: string;
    // file only:
    pathTemplate?: string;                               // e.g. "~/recordings/{date}-{time}.{ext}"
    rotateEveryMinutes?: number;                         // optional log-rotate-style
    autoStart?: boolean;                                 // start when app launches
  };
  ```
- **Status reported back per encoder:** `{ status: 'idle' | 'connecting' | 'streaming' | 'error' | 'stopped', bytesEncoded, secondsEncoded, currentBitrate, listeners?, error? }`.

#### Local Output
Takes the mixer's output and sends it to a local audio device.
- **UI:** Volume slider, output device selector (a system can have multiple output devices; without this the DJ can't pick their headphones).
- Uses `setSinkId()` on a hidden `<audio>` element fed from a `MediaStreamDestinationNode`, or directly via the `AudioContext`'s output (browsers vary; AudioContext sink selection is gaining support - fall back to the audio-element trick if needed).
- Multiple instances allowed (different devices for monitoring booth, headphones, etc.).

#### Mixer *(implicit module, not shown in the doc above but required)*
- Singleton, always present, owns the master `AudioContext` and the master bus.
- Exposes the master output stream to encoders and local output.
- UI: master volume, master dB meter, soft-clip / limiter on/off (recommended on by default - protects listeners from accidental clipping spikes).

### Metadata Selection (which deck "wins" the now-playing slot)

When more than one deck has "Send metadata" enabled and is producing audio, the streaming server can only show one "now playing" string. The rule:

1. The deck that most recently transitioned from paused → playing wins.
2. Ties (rare - same-tick start) broken by lowest z-index.
3. When the winning deck stops, the metadata holder switches to whichever other "send metadata" deck is currently playing, again by most-recent-start.
4. If the mic is open, **metadata does not change** - the last winning deck's metadata is left in place. (Listeners don't want "talking" appearing as a track title.)
5. Debounce: a metadata update is sent at most once every 3 seconds, so rapid track changes / scrubs don't spam the server.

### Hotkeys

Hotkeys are bound to **module instance IDs**, not module types. Binding "F1 → play" to a generic deck would be ambiguous when there are 4 decks open. The hotkey panel lists every instance and offers an action picker per instance.

- Default bindings on first launch:
  - F1 / F2: play/pause Deck A / Deck B
  - F3: push next from default queue
  - F4: fade out currently dominant deck
  - F5: master mute toggle
  - SPACE (held): mic push-to-talk
- Conflicting bindings show a warning at the moment of binding, not silently overwrite.
- Hotkeys are global within the app window (not OS-global; OS-global is post-MVP).

---

## Data & Persistence

In the main process, Drizzle is used in combination with a database using better-sqlite3 with a database in the user's profile data folder, to keep track of persistent data like the window module configuration (which modules are loaded, where they are in the layout, persistent state, etc.) or other global shared data. There should be a way for modules to access global data (like a table that has all music known to the program).

### Schema (initial)

```ts
// songs - the global music library
songs {
  id: text primary key,           // hash of (path + size + mtime)
  path: text unique not null,
  title: text, artist: text, album: text,
  durationSec: real,
  sampleRate: integer, channels: integer,
  bitrateKbps: integer, codec: text,
  artworkPath: text,              // extracted to <userData>/artwork/<hash>.jpg
  waveformPath: text,             // cached peaks JSON
  fileSize: integer, fileMtime: integer,
  addedAt: integer, lastPlayedAt: integer, playCount: integer,
  missing: integer default 0      // 1 when file no longer found at path
}

// layouts - saved arrangements of windows (a DJ might keep a "morning show"
// layout and a "night show" layout)
layouts { id, name, isActive, createdAt, updatedAt }

// module_instances - windows in the active layout
module_instances {
  id: text primary key,           // uuid, persistent across restarts
  layoutId: text references layouts(id),
  moduleId: text not null,        // e.g. 'deck'
  title: text,                    // user-renamed title
  x: real, y: real, width: real, height: real, zIndex: integer,
  minimized: integer default 0,
  settingsJson: text              // module-defined settings blob
}

// encoder_configs - encoders persist independently of layout
encoder_configs { ...EncoderConfig fields, lastStartedAt }

// queue_items - for queue modules with persistence enabled
queue_items { id, queueInstanceId, songId, position }

// hotkeys - per instance
hotkeys { id, instanceId, action, accelerator }   // e.g. instanceId='deck-uuid', action='play', accelerator='F1'

// secrets - encrypted blobs (safeStorage); referenced by passwordRef from encoder_configs
secrets { ref text primary key, encryptedBlob blob, createdAt, updatedAt }

// settings - global key/value
settings { key text primary key, value text }
```

### Library scanning

- User adds a folder; scanner walks it (worker thread on the main side), extracts metadata via [`music-metadata`](https://www.npmjs.com/package/music-metadata), inserts/updates rows in `songs`.
- Use `chokidar` to watch known folders for changes and update incrementally.
- Removed files: mark as missing rather than deleting the row, so playlists/queues don't break silently.

### Secrets

Stream passwords are encrypted with **Electron's `safeStorage` API** and the resulting ciphertext blob is stored in the `secrets` table. The `encoder_configs.passwordRef` column holds the row key for the secret, never the password itself.

- **Why `safeStorage` over `keytar`:** no native module to compile per platform (huge win for cross-platform builds), built into Electron, async API supports key rotation. Internally uses Keychain on macOS, DPAPI on Windows, and `gnome-libsecret` / `kwallet` on Linux.
- Use `encryptStringAsync` / `decryptStringAsync` (the async API). The sync API may be deprecated in a future Electron version.
- **Linux fallback:** if no secret store is available, `safeStorage.getSelectedStorageBackend()` returns `"basic_text"`. In that case, on first save of a secret, show a warning toast: *"Your system doesn't have a password manager configured (gnome-keyring or kwallet). Stream passwords will be stored with weak encryption. Install gnome-keyring or kwallet to fix this."*
- **Layout export** strips secrets - exported JSON contains the encoder config minus `passwordRef`. The importer prompts the user to re-enter passwords.

---

## IPC Protocol (Renderer ↔ Main)

Two channels, both typed via shared definitions in `packages/shared`:

1. **Control plane** - request/response and pub/sub for everything except audio. Recommended: `electron-trpc` or hand-rolled with `ipcMain.handle` + a thin typed wrapper. Methods:
   - `library.scanFolder(path)` → progress events
   - `library.search(query)` → `Song[]`
   - `encoder.start(config)` → `{ uuid }`
   - `encoder.stop(uuid)`
   - `encoder.status(uuid)` → status object (also pushed on change)
   - `layout.save(layout)` / `layout.load(id)` / `layout.list()`
   - `secret.set(ref, value)` / `secret.get(ref)` / `secret.delete(ref)`  *(internal only - used by the main process when launching encoders; the renderer never sees the plaintext password)*
   - `system.openExternal(url)`, `system.showItemInFolder(path)`, etc.

2. **Audio data plane** - `MessageChannelMain` port handed to the renderer at startup. Renderer transfers `ArrayBuffer`s of PCM tagged with `{ encoderTargets: uuid[] }` so the main process can fan out a single buffer to multiple encoder children without copying.

---

## Streaming Protocols (detail)

### Icecast 2 (preferred)
- Connect: HTTPS or HTTP `PUT /<mount>` with `Authorization: Basic base64(user:pass)`, `Content-Type: audio/mpeg | audio/aac | application/ogg | audio/ogg` as appropriate, `Ice-Public`, `Ice-Name`, `Ice-Description`, `Ice-Genre`, `Ice-URL`, `Ice-Bitrate`.
- Send: write encoded bytes to the request body indefinitely. Real-time pacing handled by the encoder's natural rate (encoded audio comes out at real-time speed because PCM is fed in at real-time speed).
- Metadata: `GET /admin/metadata?mode=updinfo&mount=<mount>&song=<urlencoded>` with the same Basic auth, fired according to the [metadata selection rules](#metadata-selection-which-deck-wins-the-now-playing-slot).

### Shoutcast 2
- Use `nodeshout` (libshout) - abstracts SHOUTcast 1, SHOUTcast 2, and Icecast 2 behind one API. Trade-off: native dependency to bundle per platform.

### File output
- Encoded stream piped to `fs.createWriteStream`. Optional rotation: close + reopen with a new filename every N minutes. Filename template variables: `{date}`, `{time}`, `{datetime}`, `{format}`, `{encoderName}`.

---

## Encoding (detail)

| Format     | FFmpeg encoder       | Notes                                                                                                |
|------------|----------------------|------------------------------------------------------------------------------------------------------|
| MP3        | libmp3lame           | MVP must-have. Most compatible.                                                                      |
| AAC        | aac (native)         | Default for AAC. Quality is fine for streaming, fully redistributable.                               |
| AAC (HQ)   | libfdk_aac           | Optional, NOT bundled. Auto-detected if the user replaces the bundled FFmpeg with one that has it.   |
| Ogg Vorbis | libvorbis            | Open format, decent compatibility.                                                                   |
| Opus       | libopus              | Best quality at low bitrates; less Icecast-player support historically.                              |
| FLAC       | flac                 | File output only - too high-bitrate for typical streaming.                                           |

**Bundling FFmpeg:**

- Use [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) which ships static binaries per platform. On installer launch, extract the binary to `<userData>/bin/ffmpeg(.exe)`, verify the SHA-256 checksum against a manifest shipped with the app, and call it via `child_process.spawn`.
- The bundled FFmpeg uses an LGPL-only build (no `--enable-gpl`, no `--enable-nonfree`) so it's redistributable under AGPLv3 + the dual-license model.

**On the libfdk_aac question:**

> *"if libfdk_aac can be used with our dynamic linking strat, maybe that one is better?"*

This is a common misconception worth clearing up. The reason libfdk_aac is problematic isn't GPL compatibility (which dynamic linking can address via LGPL-style isolation) - it's **redistribution restrictions** in the Fraunhofer license. Dynamic linking doesn't fix that on its own; we'd still be redistributing the codec. So:

- **What we ship:** an LGPL FFmpeg with the native `aac` encoder. Native AAC quality is fine for typical streaming bitrates (96 kbps+).
- **Power-user escape hatch:** the FFmpeg binary path is exposed in the app's advanced settings. A user who has separately compiled FFmpeg with libfdk_aac (legal in their jurisdiction, for personal use) can point Streamline at it. On encoder configuration, we run `ffmpeg -encoders` once and detect which AAC encoders are available, then offer them in the dropdown. We never download or distribute libfdk_aac.

---

## Supported Audio Formats (input)

For decoding songs into decks, rely on Chromium's built-in decoders (Electron uses Chromium's media stack). Supported out of the box: **MP3, AAC (in M4A/MP4), FLAC, WAV, Ogg Vorbis, Opus**. If extended formats are needed (e.g. WMA, APE), decode via FFmpeg in the main process and stream PCM back - out of scope for MVP.

---

## UX Essentials

These are not "nice-to-haves" for a DJ tool - leaving them out makes the MVP unusable on air.

- **Keyboard shortcuts.** See [Hotkeys](#hotkeys). Configurable per instance, persisted in the `hotkeys` table.
- **Theme.** Dark mode by default; light mode optional. Studios are dim. Use CSS variables so plugins can theme correctly.
- **Layouts.** Multiple named layouts the user can switch between (`layouts` table). Each layout owns its own set of `module_instances`. Useful for "morning show" vs "night show" vs "guest mix".
- **Layout import/export.** JSON file. Lets users share setups. Strips secrets on export (per [Secrets](#secrets)).
- **First-run experience.** A blank canvas is hostile. On first launch, create a default layout containing:
  - Two main decks titled **"A"** and **"B"** with "Send metadata" enabled and "Accepts from queue" set to the default queue. These are the on-air decks.
  - One **"Aux"** deck with "Send metadata" disabled and "Accepts from queue" set to none. This is for jingles, sound effects, station IDs, ad breaks - anything that shouldn't appear in the now-playing string and isn't part of the main rotation.
  - One Queue (the default queue, bound to A and B).
  - One Crossfader bound to A ↔ B with auto-fade-on-track-end enabled.
  - One Microphone.
  - One Encoders module (no encoders configured - user must add their server).
  - One Local Output.
- **Status bar.** Always-visible footer showing: master level, active encoder count and aggregate state (green/yellow/red), CPU usage, current time.
- **"On air" indicator.** A clear visual signal somewhere that **at least one encoder is currently streaming**. DJs forget. Listeners notice.
- **Unsigned-build warnings.** Until the project ships signed binaries, the installers will trigger OS warnings. The download page must include clear, screenshotted instructions for:
  - **Windows:** SmartScreen "More info → Run anyway".
  - **macOS:** the "unidentified developer" Gatekeeper bypass - System Settings → Privacy & Security → "Open Anyway", *not* the right-click → Open trick (which Apple has been deprecating).
  - **Linux:** AppImage executable bit, AppArmor profile notes for Ubuntu 24.04+.

---

## Logging, Errors, Crashes

- Logs to `<userData>/logs/streamline-<date>.log`, rotated daily, last 14 kept. Levels: error/warn/info/debug. Library: `electron-log`.
- Streaming errors (disconnects, auth failures, encoder crashes) are surfaced as **toasts in the UI** *and* logged. A streaming failure that's only logged is a streaming failure the DJ won't know about until listeners complain.
- **No crash reporting backend.** Users can inspect logs themselves; the Help menu has an "Open log folder" item that opens `<userData>/logs/` in the OS file manager - no copy-paste-the-path required.

---

## Security & Privacy

- Renderer is sandboxed with `contextIsolation: true`. Only an explicit, typed `preload.ts` exposes a small API surface to the renderer.
- All file system access lives in main. Renderer asks via IPC.
- Secrets encrypted with `safeStorage` and stored in the `secrets` table (see [Secrets](#secrets)). The renderer never sees plaintext passwords.
- Auto-update (post-MVP) must use signed updates only.
- Plugins run unsandboxed in the MVP - **document this clearly in the plugin developer docs and the install-plugin UI**. A future capability-based plugin sandbox is on the roadmap.

---

## Cross-Platform & Distribution

- **Packager:** `electron-forge` with Vite plugin. Outputs: Windows Squirrel installer, macOS DMG, Linux AppImage + .deb + .rpm. Snap and Flatpak are roadmap.
- **Code signing:** **not budgeted in the MVP**. Builds will be unsigned until the project has the means or a sponsor. Until then, the download page documents the OS-specific install warnings (see [UX Essentials](#ux-essentials)). When budget allows, prioritize macOS Developer ID + notarization (Gatekeeper warnings are the most user-hostile), then Windows code signing.
- **Auto-update:** post-MVP. `electron-updater` with GitHub Releases as the feed.
- **Linux audio:** PipeWire is increasingly default; PulseAudio still common; ALSA underneath both. Electron/Chromium handles abstraction - we do not need platform-specific audio code.
- **Microphone permission:** macOS requires `NSMicrophoneUsageDescription` in `Info.plist` *and* a runtime prompt. Document the entitlement in the build config.

---

## Testing

- **Unit:** Vitest. Cover the audio mixer's gain math, the IPC protocol serialization, the encoder config validation, the library scanner's metadata extraction, the queue rotation algorithm, the metadata selection rules.
- **Integration:** spawn a real Electron instance with Playwright. Verify: app boots, default layout appears, drag-drop a fixture mp3 into a deck plays it, encoder pointed at a local Icecast (running in a Docker fixture) successfully streams.
- **Manual checklist** (release gate):
  1. Stream MP3 to public Icecast for >30 minutes - bitrate stable, no dropouts.
  2. Disconnect network, reconnect - encoder reconnects automatically.
  3. Push-to-talk while two decks are playing - voice mixes correctly, no clicks.
  4. Save layout, restart, reopen - windows restored exactly.
  5. Load and unload a third-party plugin (one window-kind, one headless-kind) - no leaks, no crashes.
  6. Crossfader auto-fade on track end actually triggers and lands cleanly on the next deck.
  7. On Linux without a keyring installed, the app warns the user and still works (with weak encryption).

---

## Roadmap (post-MVP)

Numbered loosely by priority, not committed.

1. **Auto-DJ** - silence-detect end of track, fade to next, configurable mix-out time per song. (The Crossfader handles the manual / track-end case in MVP; Auto-DJ adds more sophisticated behavior.)
2. **Cart wall / jingle player** - grid of buttons, each loads a short audio file, instant playback with hotkeys.
3. **Voice tracking** - pre-record links between songs, schedule them.
4. **Now-playing web view** - small HTTP server in main exposes current song as JSON / HTML for embedding in OBS or a website.
5. **History log module** - view what's been played, with timestamps, exportable to CSV.
6. **User-configurable audio routing graph** - let plugins insert effects (compressor, EQ, ducker) between sources and the mixer.
7. **Plugin sandboxing** - capability-based, plugins declare which APIs they need, user approves at install time.
8. **Plugin registry** - in-app browser for community plugins. Not coming soon; for now users install plugins manually by dropping a folder into `<userData>/plugins/`.
9. **Hot reload** - develop plugins without restarting the app.
10. **OS-global hotkeys** - so DJs can trigger actions from outside the app window.
11. **Auto-update** - signed updates via `electron-updater`.

---

## Resolved Decisions

These were open questions; answers are recorded here so they don't get re-debated.

| #  | Topic                                  | Decision                                                                                                                                                                                             |
|----|----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | License                                | **AGPLv3** + paid commercial license for proprietary plugins / commercial use without copyleft. Commercial license is for later. CLA or DCO-with-relicensing-grant required from contributors.       |
| 2  | Crossfader                             | **In MVP.** See [Crossfader](#crossfader).                                                                                                                                                           |
| 3  | Queue auto-advance with multiple decks | Each deck individually opts in via "Accepts from queue". Queue rotates through opted-in decks in **z-index order**.                                                                                  |
| 4  | Crash reporting backend                | **None.** Users can inspect logs themselves; "Open log folder" in the Help menu.                                                                                                                     |
| 5  | Code signing                           | **Not budgeted yet.** Document install warnings on the download page until that changes.                                                                                                             |
| 6  | Secret storage                         | **Electron's `safeStorage`** (not keytar). No native dep, async API, supports key rotation. Encrypted blob lives in the SQLite `secrets` table.                                                      |
| 7  | AAC encoder                            | **Native `aac`** in the bundled LGPL FFmpeg. **`libfdk_aac` not bundled** (redistribution license). Power-user escape hatch: replace the FFmpeg binary; the app auto-detects available encoders.     |
| 8  | Project name "Streamline"              | Address only if a C&D arrives. No proactive trademark search.                                                                                                                                        |
| 9  | Plugin kinds                           | **`window` and `headless`.** Headless plugins manage state / audio without a draggable UI; configured from a global Plugins panel.                                                                   |
| 10 | Sample rate                            | **Internal: 48 kHz** (forced via `new AudioContext({ sampleRate: 48000 })`). **Output: per-encoder**, FFmpeg resamples on the way out via `-ar`. Supported output rates: 22050, 32000, 44100, 48000. |

---

## Open Questions

The AI builder should ask the human before silently picking on these. (None blocking right now - all previously open questions are resolved. New ones may accumulate as implementation begins.)

*(empty)*