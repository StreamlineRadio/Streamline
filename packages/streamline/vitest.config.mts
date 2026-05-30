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
		environmentMatchGlobs: [['renderer/src/**/*.component.spec.ts', 'jsdom']]
	}
});
