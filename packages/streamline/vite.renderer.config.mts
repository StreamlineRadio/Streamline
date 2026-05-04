import tailwindcss from '@tailwindcss/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { createRequire } from 'module'
import { resolve } from 'path'

const require = createRequire(import.meta.url)

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	build: {
		rollupOptions: {
			input: {
				main_window: resolve(__dirname, 'index.html'),
				'tap-processor': require.resolve('@streamline/audio-worklet/tap-processor')
			},
			output: {
				entryFileNames: (chunk) =>
					chunk.name === 'tap-processor' ? 'worklets/tap-processor.js' : 'assets/[name]-[hash].js',
				chunkFileNames: 'assets/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash][extname]'
			}
		}
	}
})
