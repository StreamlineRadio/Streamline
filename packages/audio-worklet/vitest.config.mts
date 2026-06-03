import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
			include: ['src/tap-processor.ts'],
			exclude: ['src/index.ts']
		}
	}
});
