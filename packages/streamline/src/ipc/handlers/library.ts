import { ipcMain, BrowserWindow, app } from 'electron';
import { like, eq, and } from 'drizzle-orm';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { IPC } from '@streamline/shared';
import { getDb, schema } from '../../db';
import { scanFolder } from '../../library/scanner';
import { watchFolders, setWatcherWindow } from '../../library/watcher';
import { log } from '../../logging';

let _mainWindow: BrowserWindow | null = null;

export function setLibraryWindow(mainWindow: BrowserWindow): void {
	_mainWindow = mainWindow;
	setWatcherWindow(mainWindow);
}

export function registerLibraryHandlers(): void {
	ipcMain.handle(IPC.LIBRARY_ADD_FOLDER, (_e, folder: string) => {
		getDb()
			.insert(schema.libraryFolders)
			.values({ path: folder, addedAt: Date.now() })
			.onConflictDoNothing()
			.run();
		if (_mainWindow) scanFolder(folder, _mainWindow);
		const allFolders = getDb()
			.select()
			.from(schema.libraryFolders)
			.all()
			.map((row) => row.path);
		watchFolders(allFolders);
		log.info('Added library folder', { folder });
	});

	ipcMain.handle(IPC.LIBRARY_LIST_FOLDERS, () =>
		getDb()
			.select()
			.from(schema.libraryFolders)
			.all()
			.map((row) => row.path)
	);

	ipcMain.handle(IPC.LIBRARY_SCAN_FOLDER, (_e, folder: string) => {
		if (_mainWindow) scanFolder(folder, _mainWindow);
	});

	ipcMain.handle(IPC.LIBRARY_SEARCH, (_e, query: string) => {
		if (!query.trim()) {
			return getDb()
				.select()
				.from(schema.songs)
				.where(eq(schema.songs.missing, false))
				.limit(200)
				.all();
		}
		const queryPattern = `%${query}%`;
		return getDb()
			.select()
			.from(schema.songs)
			.where(and(like(schema.songs.title, queryPattern), eq(schema.songs.missing, false)))
			.limit(100)
			.all();
	});

	ipcMain.handle(
		IPC.LIBRARY_GET_SONG,
		(_e, id: string) =>
			getDb().select().from(schema.songs).where(eq(schema.songs.id, id)).get() ?? null
	);

	ipcMain.handle(IPC.LIBRARY_READ_AUDIO_FILE, async (_e, filePath: string) => {
		const buffer = await readFile(filePath);
		return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
	});

	ipcMain.handle(IPC.LIBRARY_SAVE_WAVEFORM, async (_e, hash: string, peaks: number[]) => {
		const waveformsDir = join(app.getPath('userData'), 'waveforms');
		await mkdir(waveformsDir, { recursive: true });
		await writeFile(join(waveformsDir, `${hash}.json`), JSON.stringify(peaks));
	});

	ipcMain.handle(IPC.LIBRARY_LOAD_WAVEFORM, async (_e, hash: string) => {
		const waveformPath = join(app.getPath('userData'), 'waveforms', `${hash}.json`);
		try {
			const content = await readFile(waveformPath, 'utf-8');
			return JSON.parse(content) as number[];
		} catch {
			return null;
		}
	});
}
