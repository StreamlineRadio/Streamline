# Electron Makers & Update Check Design

**Date:** 2026-04-30  
**Branch:** retry  
**Scope:** `packages/electron`

---

## 1. Makers (`forge.config.ts`)

Replace the current maker list with platform-appropriate installers for GitHub Releases distribution.

| Platform | Maker | Output | Notes |
|----------|-------|--------|-------|
| Windows  | `MakerSquirrel` | `Setup.exe` | Unchanged |
| macOS    | `MakerDMG` | `.dmg` | Replaces `MakerZIP` |
| Linux    | `MakerAppImage` | `.AppImage` | New - broadest distro compatibility |
| Linux    | `MakerDeb` | `.deb` | Unchanged |
| Linux    | `MakerRpm` | `.rpm` | Unchanged |

Electron Forge automatically restricts each maker to its native platform, so a `make` on macOS only produces the DMG.

**New packages required:**
- `@electron-forge/maker-dmg`
- `@electron-forge/maker-appimage`

---

## 2. Version Check Module (`src/update-check.ts`)

A dedicated module exporting a single `checkForUpdates()` async function.

### Call site

Called once in `main.ts` after `app.whenReady()`, fire-and-forget (no `await`). Errors are caught internally and never propagate - a failed check must never crash the app.

```ts
app.whenReady().then(() => {
  checkForUpdates();
  createWindow();
  // ...
});
```

### Logic

1. **Guard:** if `!app.isPackaged`, return immediately. No check or notification in dev mode.
2. **Fetch:** `GET https://api.github.com/repos/StreamlineRadio/Streamline/releases/latest`  
   Headers: `User-Agent: Streamline-App` (GitHub API requires a User-Agent).
3. **Parse:** extract `tag_name` (e.g. `v1.2.3`), strip leading `v`.
4. **Compare:** compare remote version against `app.getVersion()` using semver. If remote is strictly greater, proceed.
5. **Notify:** show an OS notification via Electron's `Notification` API:
   - Title: `"Streamline update available"`
   - Body: `"Version X.Y.Z is available. Click to download."`
   - On click: `shell.openExternal("https://github.com/StreamlineRadio/Streamline/releases/latest")`
6. **Silent on no-op:** same version, older remote, network error, rate limit, or malformed response - do nothing.

### Error handling

Wrap the entire function body in `try/catch`. Log the error at debug level (via `electron-log` when available, or `console.error` for now). Never surface to the user.

### Constraints

- No retry logic - one attempt per startup.
- No periodic checks - startup only.
- No persistence - no tracking of "user dismissed this version".
- Semver comparison: strip `v` prefix, split on `.`, compare numerically (major → minor → patch). No need for a semver library for this simple case.