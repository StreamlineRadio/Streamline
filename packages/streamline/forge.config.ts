import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerAppImage } from '@reforged/maker-appimage';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE_ROOT = join(__dirname, '..', '..');
const HOISTED_NATIVE_MODULES = ['better-sqlite3', 'bindings', 'file-uri-to-path', 'ffmpeg-static'];

const config: ForgeConfig = {
	hooks: {
		packageAfterCopy: async (_forgeConfig, buildPath) => {
			for (const moduleName of HOISTED_NATIVE_MODULES) {
				cpSync(
					join(WORKSPACE_ROOT, 'node_modules', moduleName),
					join(buildPath, 'node_modules', moduleName),
					{ recursive: true }
				);
			}
			// The workspace root's better-sqlite3 may have a .forge-meta left from a previous `pnpm dev`
			// run that claims the correct Electron ABI — but the .node itself was subsequently recompiled
			// for system Node by the `pretest` hook. Forge's rebuildConfig sees the stale marker and skips
			// recompilation, leaving an ABI-mismatched binary in the package. Removing it forces a fresh
			// rebuild against the correct Electron headers.
			rmSync(join(buildPath, 'node_modules', 'better-sqlite3', 'build', 'Release', '.forge-meta'), {
				force: true
			});
		}
	},
	packagerConfig: {
		asar: { unpack: '{node_modules/better-sqlite3/**,node_modules/ffmpeg-static/**}' },
		name: 'Streamline',
		executableName: 'streamline',
		appBundleId: 'com.streamlineradio.Streamline',
		icon: './assets/icon',
		extraResource: ['./assets/icon.png']
	},
	rebuildConfig: {
		onlyModules: ['better-sqlite3']
	},
	makers: [
		new MakerSquirrel({ name: 'Streamline', setupIcon: 'assets/icon.ico' }, ['win32']),
		new MakerDMG({ icon: 'assets/icon.icns' }, ['darwin']),
		new MakerAppImage(
			{
				options: {
					categories: ['Audio'],
					icon: 'assets/icon.png'
				}
			},
			['linux']
		),
		new MakerDeb(
			{
				options: {
					categories: ['Audio'],
					// maker-deb types `icon` as a string, but electron-installer-debian only
					// installs into the hicolor theme (where desktop environments resolve the
					// launcher/taskbar icon) when given a resolution-keyed object. A bare string
					// lands only in the legacy /usr/share/pixmaps fallback, which GNOME ignores.
					icon: {
						'512x512': 'assets/icon.png',
						scalable: 'assets/icon.svg'
					} as unknown as string
				}
			},
			['linux']
		),
		new MakerRpm(
			{
				options: {
					categories: ['Audio'],
					// See MakerDeb above: object form is required for hicolor theme installation.
					icon: {
						'512x512': 'assets/icon.png',
						scalable: 'assets/icon.svg'
					} as unknown as string
				}
			},
			['linux']
		)
	],
	plugins: [
		new VitePlugin({
			build: [
				{
					entry: 'src/main.ts',
					config: 'vite.main.config.ts',
					target: 'main'
				},
				{
					entry: 'src/preload.ts',
					config: 'vite.preload.config.ts',
					target: 'preload'
				}
			],
			renderer: [
				{
					name: 'main_window',
					config: 'vite.renderer.config.mts'
				}
			]
		}),
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true
		})
	]
};

export default config;
