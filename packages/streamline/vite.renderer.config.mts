import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	build: {
		rollupOptions: {
			input: {
				main_window: resolve(__dirname, 'index.html')
			}
		}
	}
});
