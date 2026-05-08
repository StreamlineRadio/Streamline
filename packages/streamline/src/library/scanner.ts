import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import type { Song } from '@streamline/shared';
import { IPC } from '@streamline/shared';
import { getDb, schema } from '../db';
import { log } from '../logging';
import type { BrowserWindow } from 'electron';

type WorkerMessage =
	| { type: 'song'; data: Song }
	| { type: 'progress'; current: number; file: string }
	| { type: 'done'; total: number }
	| { type: 'error'; file: string; error: string }
	| { type: 'fatal'; error: string };

export function scanFolder(folder: string, mainWindow: BrowserWindow): void {
	const worker = new Worker(join(__dirname, 'scan-worker.js'), {
		workerData: { folder }
	});

	worker.on('message', (message: WorkerMessage) => {
		if (message.type === 'song') {
			const db = getDb();
			db.insert(schema.songs)
				.values(message.data)
				.onConflictDoUpdate({
					target: schema.songs.path,
					set: {
						title: message.data.title,
						artist: message.data.artist,
						album: message.data.album,
						fileMtime: message.data.fileMtime
					}
				})
				.run();
		}
		if (message.type === 'progress') {
			mainWindow.webContents.send(IPC.LIBRARY_SCAN_PROGRESS, {
				folder,
				current: message.current,
				total: 0,
				currentFile: message.file
			});
		}
		if (message.type === 'done') {
			log.info('Scan complete', { folder, total: message.total });
			mainWindow.webContents.send(IPC.LIBRARY_SCAN_PROGRESS, {
				folder,
				current: message.total,
				total: message.total,
				currentFile: 'Done'
			});
		}
		if (message.type === 'error') {
			log.warn('Scan error for file', { file: message.file, error: message.error });
		}
		if (message.type === 'fatal') {
			log.error('Scanner worker fatal error', { error: message.error });
		}
	});

	worker.on('error', (err) => log.error('Scanner worker error', err));
}
