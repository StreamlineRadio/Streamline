import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['renderer/src/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}']
	}
});