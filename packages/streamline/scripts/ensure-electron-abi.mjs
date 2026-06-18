// better-sqlite3 must be compiled against Electron's ABI to load in the main process,
// but the test runner (vitest, system Node) and pnpm's native-build cache keep leaving
// a Node-ABI binary behind — so `pnpm dev` intermittently crashes with a
// NODE_MODULE_VERSION mismatch. Electron Forge's own "Preparing native dependencies"
// step does not fix it here: with nodeLinker=hoisted, better-sqlite3 lives in the
// workspace-root node_modules and is absent from any package's dependency tree, so
// Forge's rebuild walk never reaches it.
//
// This guard runs before `electron-forge start`. It loads better-sqlite3 under the
// Electron runtime (the only reliable ABI probe, since better-sqlite3 keeps separate
// per-ABI binaries); if that fails it rebuilds the hoisted module from source against
// Electron's headers. The happy path is a sub-second probe, so normal dev is unaffected;
// the ~1-minute compile only happens when the binary is actually wrong.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(scriptDirectory, '..', '..', '..');
const resolveFromHere = createRequire(import.meta.url);

const electronExecutable = resolveFromHere('electron');
const electronVersion = resolveFromHere('electron/package.json').version;

const binaryLoadsUnderElectron = () => {
	const probe = spawnSync(electronExecutable, ['-e', "require('better-sqlite3')"], {
		env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
		stdio: 'ignore'
	});
	return probe.status === 0;
};

if (binaryLoadsUnderElectron()) {
	process.exit(0);
}

console.log(
	`[ensure-electron-abi] better-sqlite3 is not built for Electron ${electronVersion}; rebuilding from source (this takes about a minute)...`
);

const { rebuild } = resolveFromHere('@electron/rebuild');

await rebuild({
	buildPath: workspaceRoot,
	electronVersion,
	arch: process.arch,
	onlyModules: ['better-sqlite3'],
	extraModules: new Set(['better-sqlite3']),
	buildFromSource: true,
	force: true
});

console.log('[ensure-electron-abi] better-sqlite3 rebuilt for Electron.');
