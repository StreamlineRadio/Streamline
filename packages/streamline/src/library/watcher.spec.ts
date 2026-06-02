import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('../logging', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const dbMock = {
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	run: vi.fn()
};
vi.mock('../db', () => ({
	getDb: () => dbMock,
	schema: { songs: { path: 'path', missing: 'missing' } }
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));

const { scanFolderMock } = vi.hoisted(() => ({ scanFolderMock: vi.fn() }));
vi.mock('./scanner', () => ({ scanFolder: scanFolderMock }));

let chokidarInstance: EventEmitter & { close: ReturnType<typeof vi.fn> };
vi.mock('chokidar', () => ({
	default: {
		watch: vi.fn().mockImplementation(() => {
			chokidarInstance = Object.assign(new EventEmitter(), {
				close: vi.fn().mockResolvedValue(undefined)
			});
			return chokidarInstance;
		})
	}
}));

import { watchFolders, setWatcherWindow } from './watcher';
import type { BrowserWindow } from 'electron';

const fakeWindow = { webContents: { send: vi.fn() } } as unknown as BrowserWindow;

describe('watcher', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setWatcherWindow(fakeWindow);
		// reset watcher state between tests
		watchFolders([]);
	});

	it('does nothing when folders list is empty', () => {
		watchFolders([]);
		expect(chokidarInstance).toBeUndefined();
	});

	it('starts a chokidar watcher for provided folders', async () => {
		const chokidar = await import('chokidar');
		watchFolders(['/music']);
		expect(chokidar.default.watch).toHaveBeenCalledWith(['/music'], expect.any(Object));
	});

	it('closes previous watcher before starting a new one', () => {
		watchFolders(['/music']);
		const firstInstance = chokidarInstance;
		watchFolders(['/other']);
		expect(firstInstance.close).toHaveBeenCalledOnce();
	});

	it('triggers scanFolder on "add" for supported extension', () => {
		watchFolders(['/music']);
		chokidarInstance.emit('add', '/music/song.mp3');
		expect(scanFolderMock).toHaveBeenCalledWith('/music', fakeWindow);
	});

	it('ignores "add" for unsupported extension', () => {
		watchFolders(['/music']);
		chokidarInstance.emit('add', '/music/cover.jpg');
		expect(scanFolderMock).not.toHaveBeenCalled();
	});

	it('marks song missing on "unlink"', () => {
		watchFolders(['/music']);
		chokidarInstance.emit('unlink', '/music/gone.mp3');
		expect(dbMock.update).toHaveBeenCalledOnce();
		expect(dbMock.run).toHaveBeenCalledOnce();
	});

	it('handles watcher error event without throwing', () => {
		watchFolders(['/music']);
		expect(() => chokidarInstance.emit('error', new Error('FS error'))).not.toThrow();
	});
});
