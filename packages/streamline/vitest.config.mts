import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	resolve: {
		conditions: ['browser']
	},
	test: {
		environment: 'node',
		include: ['renderer/src/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./vitest.setup.ts'],
		environmentMatchGlobs: [['renderer/src/**/*.component.spec.ts', 'jsdom']],
		coverage: {
			provider: 'v8',
			thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
			include: ['src/**/*.ts', 'renderer/src/**/*.ts', 'renderer/src/**/*.svelte'],
			exclude: [
				'**/*.spec.ts',
				'**/*.test.ts',
				'src/main.ts',
				'src/preload.ts',
				'src/logging/index.ts',
				'src/ipc/register.ts',
				'src/db/index.ts',
				'src/db/schema.ts',
				'src/globals.d.ts',
				'renderer/src/main.ts',
				'renderer/src/env.d.ts',
				'renderer/src/App.svelte',
				'renderer/src/modules/manifest.ts',
				'renderer/src/modules/crossfader/manifest.ts',
				'renderer/src/modules/deck/manifest.ts',
				'renderer/src/modules/deck/types.ts',
				'renderer/src/modules/encoders/manifest.ts',
				'renderer/src/modules/local-output/manifest.ts',
				'renderer/src/modules/microphone/manifest.ts',
				'renderer/src/modules/mixer/manifest.ts',
				'renderer/src/modules/queue/manifest.ts'
			]
		}
	}
});
