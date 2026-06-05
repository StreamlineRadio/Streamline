import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
			include: ['src/types/encoder.ts'],
			exclude: []
		}
	}
});
