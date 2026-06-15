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
			experimentalAstAwareRemapping: true,
			thresholds: {
				// Every file must be fully covered, except the pinned files below, which
				// contain compiler/library artifacts no test can reach: Svelte emits an
				// unhittable `?? ''` fallback for <option value={...}> and attribute
				// interpolations, and FontAwesomeIcon reads its props once at mount.
				// Each pinned file sits at its exact achievable percentage so any NEW
				// untested code still fails the gate. When an artifact goes away, raise the pin.
				'!**/{DbMeter,ComboField,Crossfader,Encoders,LocalOutput,Microphone,WindowWrapper,Queue,WindowManager}.svelte':
					{ lines: 100, functions: 100, statements: 100, branches: 100, perFile: true },
				'**/DbMeter.svelte': { lines: 100, functions: 100, statements: 100, branches: 83.33 },
				'**/ComboField.svelte': { lines: 100, functions: 100, statements: 100, branches: 96.42 },
				'**/Crossfader.svelte': { lines: 100, functions: 100, statements: 100, branches: 77.77 },
				'**/Encoders.svelte': { lines: 100, functions: 100, statements: 100, branches: 98.91 },
				'**/LocalOutput.svelte': { lines: 100, functions: 100, statements: 100, branches: 75 },
				'**/Microphone.svelte': { lines: 100, functions: 100, statements: 100, branches: 91.66 },
				'**/WindowWrapper.svelte': { lines: 100, functions: 100, statements: 100, branches: 95 },
				'**/Queue.svelte': { lines: 99.46, functions: 100, statements: 99.6, branches: 100 },
				'**/WindowManager.svelte': { lines: 90.9, functions: 100, statements: 94.44, branches: 100 }
			},
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
