import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerAppImage } from '@reforged/maker-appimage';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
	packagerConfig: {
		asar: true,
		asarUnpack: [
			'node_modules/better-sqlite3/**',
			'node_modules/ffmpeg-static/**'
		],
		name: 'Streamline',
		executableName: 'streamline',
		appBundleId: 'com.streamlineradio.Streamline',
		icon: './assets/icon'
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
					icon: 'assets/icon.svg'
				}
			},
			['linux']
		),
		new MakerDeb(
			{
				options: {
					categories: ['Audio'],
					icon: 'assets/icon.png'
				}
			},
			['linux']
		),
		new MakerRpm(
			{
				options: {
					categories: ['Audio'],
					icon: 'assets/icon.png'
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
