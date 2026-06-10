import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('../logging', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const dbMock = {
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	onConflictDoUpdate: vi.fn().mockReturnThis(),
	run: vi.fn()
};
vi.mock('../db', () => ({ getDb: () => dbMock, schema: { songs: { path: 'path' } } }));

let workerInstance: EventEmitter;
vi.mock('node:worker_threads', () => ({
	Worker: vi.fn().mockImplementation(() => {
		workerInstance = new EventEmitter();
		return workerInstance;
	})
}));

import { scanFolder } from './scanner';
import type { Song } from '@streamline/shared';

const fakeWindow = {
	webContents: { send: vi.fn() }
} as unknown as import('electron').BrowserWindow;

function makeSong(): Song {
	return {
		id: 's1',
		path: '/music/song.mp3',
		title: 'Song',
		artist: null,
		album: null,
		durationSec: 60,
		sampleRate: 44100,
		channels: 2,
		bitrateKbps: 128,
		codec: 'mp3',
		artworkPath: null,
		waveformPath: null,
		fileSize: null,
		fileMtime: null,
		addedAt: Date.now(),
		lastPlayedAt: null,
		playCount: 0,
		missing: false
	};
}

describe('scanFolder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('inserts song on "song" message', () => {
		scanFolder('/music', fakeWindow);
		workerInstance.emit('message', { type: 'song', data: makeSong() });
		expect(dbMock.insert).toHaveBeenCalledOnce();
		expect(dbMock.run).toHaveBeenCalledOnce();
	});

	it('sends LIBRARY_SCAN_PROGRESS IPC on "progress" message', () => {
		scanFolder('/music', fakeWindow);
		workerInstance.emit('message', { type: 'progress', current: 5, file: 'song.mp3' });
		expect(fakeWindow.webContents.send).toHaveBeenCalledWith(
			'library:scanProgress',
			expect.objectContaining({ current: 5 })
		);
	});

	it('sends final progress IPC on "done" message', () => {
		scanFolder('/music', fakeWindow);
		workerInstance.emit('message', { type: 'done', total: 10 });
		expect(fakeWindow.webContents.send).toHaveBeenCalledWith(
			'library:scanProgress',
			expect.objectContaining({ current: 10, total: 10 })
		);
	});

	it('does not throw on "error" or "fatal" messages', () => {
		scanFolder('/music', fakeWindow);
		expect(() => {
			workerInstance.emit('message', { type: 'error', file: 'bad.mp3', error: 'parse fail' });
			workerInstance.emit('message', { type: 'fatal', error: 'crash' });
		}).not.toThrow();
	});

	it('handles worker error event', () => {
		scanFolder('/music', fakeWindow);
		expect(() => workerInstance.emit('error', new Error('worker crash'))).not.toThrow();
	});
});
