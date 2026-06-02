import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
	ipcMain: { handle: vi.fn() },
	app: { getPath: vi.fn().mockReturnValue('/fake/userData') }
}));
vi.mock('drizzle-orm', () => ({
	like: vi.fn(() => 'like-clause'),
	eq: vi.fn(() => 'eq-clause'),
	and: vi.fn(() => 'and-clause')
}));
vi.mock('node:fs/promises', () => ({
	readFile: vi.fn().mockResolvedValue(Buffer.from('data')),
	writeFile: vi.fn().mockResolvedValue(undefined),
	mkdir: vi.fn().mockResolvedValue(undefined)
}));

const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	get: vi.fn().mockReturnValue(null),
	all: vi.fn().mockReturnValue([]),
	limit: vi.fn().mockReturnThis(),
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	onConflictDoNothing: vi.fn().mockReturnThis(),
	run: vi.fn()
};
vi.mock('../../db', () => ({
	getDb: () => mockDb,
	schema: {
		songs: { id: 'id', path: 'path', missing: 'missing', title: 'title' },
		libraryFolders: { path: 'path' }
	}
}));

const { scanFolderMock, watchFoldersMock } = vi.hoisted(() => ({
	scanFolderMock: vi.fn(),
	watchFoldersMock: vi.fn()
}));
vi.mock('../../library/scanner', () => ({ scanFolder: scanFolderMock }));
vi.mock('../../library/watcher', () => ({
	watchFolders: watchFoldersMock,
	setWatcherWindow: vi.fn()
}));

vi.mock('music-metadata', () => ({
	parseFile: vi.fn().mockResolvedValue({
		common: { title: 'Test', artist: 'Artist', album: null },
		format: {
			duration: 60,
			sampleRate: 44100,
			numberOfChannels: 2,
			bitrate: 128000,
			codec: 'mp3'
		}
	})
}));

vi.mock('../../logging', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { registerLibraryHandlers, setLibraryWindow } from './library';
import { ipcMain } from 'electron';

function getHandler(channel: string) {
	const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (...args: unknown[]) => unknown;
}

const fakeWindow = {
	webContents: { send: vi.fn() }
} as unknown as import('electron').BrowserWindow;

describe('library IPC handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setLibraryWindow(fakeWindow);
		registerLibraryHandlers();
	});

	it('LIBRARY_ADD_FOLDER inserts folder and triggers scan + watch', () => {
		mockDb.all.mockReturnValueOnce([{ path: '/music' }]);
		getHandler('library:addFolder')(null, '/music');
		expect(mockDb.insert).toHaveBeenCalledOnce();
		expect(scanFolderMock).toHaveBeenCalledWith('/music', fakeWindow);
		expect(watchFoldersMock).toHaveBeenCalledWith(['/music']);
	});

	it('LIBRARY_LIST_FOLDERS returns folder paths', () => {
		mockDb.all.mockReturnValueOnce([{ path: '/music' }, { path: '/podcasts' }]);
		expect(getHandler('library:listFolders')(null)).toEqual(['/music', '/podcasts']);
	});

	it('LIBRARY_SCAN_FOLDER calls scanFolder when window is set', () => {
		getHandler('library:scanFolder')(null, '/music');
		expect(scanFolderMock).toHaveBeenCalledWith('/music', fakeWindow);
	});

	it('LIBRARY_SEARCH returns all songs for empty query', () => {
		const songs = [{ id: 's1', title: 'Song' }];
		mockDb.all.mockReturnValueOnce(songs);
		expect(getHandler('library:search')(null, '  ')).toEqual(songs);
	});

	it('LIBRARY_SEARCH uses LIKE filter for non-empty query', () => {
		getHandler('library:search')(null, 'rock');
		expect(mockDb.where).toHaveBeenCalled();
	});

	it('LIBRARY_GET_SONG returns null when not found', () => {
		expect(getHandler('library:getSong')(null, 's1')).toBeNull();
	});

	it('LIBRARY_GET_SONG_BY_PATH returns null when not found', () => {
		expect(getHandler('library:getSongByPath')(null, '/music/song.mp3')).toBeNull();
	});

	it('LIBRARY_GET_FILE_METADATA returns parsed metadata', async () => {
		const result = await (getHandler('library:getFileMetadata')(
			null,
			'/music/song.mp3'
		) as Promise<unknown>);
		expect(result).toMatchObject({ title: 'Test', artist: 'Artist', durationSec: 60 });
	});

	it('LIBRARY_GET_FILE_METADATA returns null on parse error', async () => {
		const { parseFile } = await import('music-metadata');
		vi.mocked(parseFile).mockRejectedValueOnce(new Error('bad file'));
		const result = await (getHandler('library:getFileMetadata')(
			null,
			'/bad.mp3'
		) as Promise<unknown>);
		expect(result).toBeNull();
	});

	it('LIBRARY_GET_COVER_ART returns null on error', async () => {
		const { parseFile } = await import('music-metadata');
		vi.mocked(parseFile).mockRejectedValueOnce(new Error('no cover'));
		const result = await (getHandler('library:getCoverArt')(
			null,
			'/music/song.mp3'
		) as Promise<unknown>);
		expect(result).toBeNull();
	});

	it('LIBRARY_GET_COVER_ART returns null when no picture', async () => {
		const { parseFile } = await import('music-metadata');
		vi.mocked(parseFile).mockResolvedValueOnce({
			common: { picture: undefined },
			format: {}
		} as Awaited<ReturnType<typeof parseFile>>);
		const result = await (getHandler('library:getCoverArt')(
			null,
			'/music/song.mp3'
		) as Promise<unknown>);
		expect(result).toBeNull();
	});

	it('LIBRARY_READ_AUDIO_FILE returns ArrayBuffer', async () => {
		const result = await (getHandler('library:readAudioFile')(
			null,
			'/music/song.mp3'
		) as Promise<unknown>);
		expect(result).toBeInstanceOf(ArrayBuffer);
	});

	it('LIBRARY_SAVE_WAVEFORM writes peaks to file', async () => {
		const { writeFile } = await import('node:fs/promises');
		await (getHandler('library:saveWaveform')(null, 'abc123', [1, 2, 3]) as Promise<unknown>);
		expect(writeFile).toHaveBeenCalled();
	});

	it('LIBRARY_LOAD_WAVEFORM returns parsed peaks', async () => {
		const { readFile } = await import('node:fs/promises');
		vi.mocked(readFile).mockResolvedValueOnce(Buffer.from('[1,2,3]') as never);
		const result = await (getHandler('library:loadWaveform')(null, 'abc123') as Promise<unknown>);
		expect(result).toEqual([1, 2, 3]);
	});

	it('LIBRARY_LOAD_WAVEFORM returns null on read error', async () => {
		const { readFile } = await import('node:fs/promises');
		vi.mocked(readFile).mockRejectedValueOnce(new Error('not found'));
		const result = await (getHandler('library:loadWaveform')(null, 'missing') as Promise<unknown>);
		expect(result).toBeNull();
	});
});
