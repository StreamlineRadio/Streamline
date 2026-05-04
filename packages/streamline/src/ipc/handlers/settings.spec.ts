import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }));
vi.mock('../../db', () => {
	const mockDb = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		get: vi.fn().mockReturnValue(null),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		onConflictDoUpdate: vi.fn().mockReturnThis(),
		run: vi.fn()
	};
	return { getDb: () => mockDb, schema: { settings: { key: 'key' } } };
});

import { registerSettingsHandlers } from './settings';
import { ipcMain } from 'electron';

describe('settings IPC handlers', () => {
	it('registers GET and SET handlers', () => {
		registerSettingsHandlers();
		expect(vi.mocked(ipcMain.handle)).toHaveBeenCalledWith('settings:get', expect.any(Function));
		expect(vi.mocked(ipcMain.handle)).toHaveBeenCalledWith('settings:set', expect.any(Function));
	});
});
