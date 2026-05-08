import { defineConfig, type Plugin } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function copyMigrations(): Plugin {
	return {
		name: 'copy-migrations',
		closeBundle() {
			const src = join(process.cwd(), 'src/db/migrations');
			const dest = join(process.cwd(), '.vite/build/migrations');
			mkdirSync(dest, { recursive: true });
			cpSync(src, dest, { recursive: true });
		}
	};
}

export default defineConfig({
	build: {
		rollupOptions: {
			external: ['better-sqlite3']
		}
	},
	plugins: [copyMigrations()]
});
