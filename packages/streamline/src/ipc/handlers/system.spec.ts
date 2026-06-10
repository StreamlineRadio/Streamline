import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { shellMock, appMock, dialogMock } = vi.hoisted(() => ({
	shellMock: {
		openExternal: vi.fn().mockResolvedValue(undefined),
		showItemInFolder: vi.fn(),
		openPath: vi.fn().mockResolvedValue(undefined)
	},
	appMock: {
		getVersion: vi.fn().mockReturnValue('1.2.3'),
		getPath: vi.fn().mockReturnValue('/home/user/Music')
	},
	dialogMock: {
		showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/chosen/file.mp3'] })
	}
}));

vi.mock('electron', () => ({
	ipcMain: { handle: vi.fn() },
	shell: shellMock,
	app: appMock,
	dialog: dialogMock
}));

import { registerSystemHandlers } from './system';
import { ipcMain } from 'electron';

function getHandler(channel: string) {
	const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (...args: unknown[]) => unknown;
}

describe('system IPC handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		appMock.getVersion.mockReturnValue('1.2.3');
		appMock.getPath.mockReturnValue('/home/user/Music');
		vi.stubGlobal('process', {
			...process,
			getCPUUsage: vi.fn().mockReturnValue({ percentCPUUsage: 12.5 })
		});
		registerSystemHandlers();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('SYSTEM_GET_APP_VERSION returns version', () => {
		expect(getHandler('system:getAppVersion')(null)).toBe('1.2.3');
	});

	it('SYSTEM_OPEN_EXTERNAL calls shell.openExternal for https URLs', async () => {
		await getHandler('system:openExternal')(null, 'https://example.com');
		expect(shellMock.openExternal).toHaveBeenCalledWith('https://example.com');
	});

	it('SYSTEM_OPEN_EXTERNAL throws for non-http protocols', () => {
		expect(() => getHandler('system:openExternal')(null, 'file:///etc/passwd')).toThrow(
			'Blocked openExternal'
		);
	});

	it('SYSTEM_SHOW_ITEM_IN_FOLDER calls shell.showItemInFolder', () => {
		getHandler('system:showItemInFolder')(null, '/some/path');
		expect(shellMock.showItemInFolder).toHaveBeenCalledWith('/some/path');
	});

	it('SYSTEM_OPEN_LOG_FOLDER calls shell.openPath with logs dir', async () => {
		appMock.getPath.mockReturnValue('/fake/userData');
		await getHandler('system:openLogFolder')(null);
		expect(shellMock.openPath).toHaveBeenCalledWith(expect.stringContaining('logs'));
	});

	it('SYSTEM_GET_CPU_USAGE returns a number', () => {
		const usage = getHandler('system:getCpuUsage')(null);
		expect(typeof usage).toBe('number');
	});

	it('SYSTEM_SELECT_FILE returns null when canceled', async () => {
		dialogMock.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
		const result = await (getHandler('system:selectFile')(null, []) as Promise<unknown>);
		expect(result).toBeNull();
	});

	it('SYSTEM_SELECT_FILE returns file path when not canceled', async () => {
		const result = await (getHandler('system:selectFile')(null, []) as Promise<unknown>);
		expect(result).toBe('/chosen/file.mp3');
	});

	it('SYSTEM_SELECT_FOLDER returns null when canceled', async () => {
		dialogMock.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
		const result = await (getHandler('system:selectFolder')(null) as Promise<unknown>);
		expect(result).toBeNull();
	});

	it('SYSTEM_SELECT_FOLDER returns folder path when not canceled', async () => {
		const result = await (getHandler('system:selectFolder')(null) as Promise<unknown>);
		expect(result).toBe('/chosen/file.mp3');
	});

	it('SYSTEM_GET_DEFAULT_RECORDINGS_FOLDER returns path with StreamlineRecordings', () => {
		const result = getHandler('system:getDefaultRecordingsFolder')(null);
		expect(result).toContain('StreamlineRecordings');
	});
});
