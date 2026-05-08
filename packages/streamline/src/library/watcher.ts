import chokidar, { type FSWatcher } from 'chokidar';
import { extname } from 'node:path';
import type { BrowserWindow } from 'electron';
import { eq } from 'drizzle-orm';
import { scanFolder } from './scanner';
import { log } from '../logging';
import { getDb, schema } from '../db';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.opus']);

let watcher: FSWatcher | null = null;
let _mainWindow: BrowserWindow | null = null;

export function setWatcherWindow(mainWindow: BrowserWindow): void {
	_mainWindow = mainWindow;
}

export function watchFolders(folders: string[]): void {
	if (watcher) {
		watcher.close().catch((err) => log.warn('Watcher close error', err));
	}
	if (folders.length === 0) return;

	watcher = chokidar.watch(folders, {
		ignoreInitial: true,
		persistent: false,
		awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 }
	});

	watcher.on('add', (filePath) => {
		if (!SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase())) return;
		const parentFolder = folders.find((f) => filePath.startsWith(f));
		if (parentFolder && _mainWindow) scanFolder(parentFolder, _mainWindow);
	});

	watcher.on('unlink', (filePath) => {
		getDb()
			.update(schema.songs)
			.set({ missing: true })
			.where(eq(schema.songs.path, filePath))
			.run();
		log.info('Song marked missing', { path: filePath });
	});

	watcher.on('error', (err) => log.error('Watcher error', err));
}
