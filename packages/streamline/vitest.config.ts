import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['renderer/src/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./vitest.setup.ts'],
		environmentMatchGlobs: [['renderer/src/**/*.component.spec.ts', 'jsdom']]
	}
});
