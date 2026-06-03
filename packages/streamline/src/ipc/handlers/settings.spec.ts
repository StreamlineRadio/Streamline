import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }));

const { mockDb } = vi.hoisted(() => ({
	mockDb: {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		get: vi.fn().mockReturnValue(null),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		onConflictDoUpdate: vi.fn().mockReturnThis(),
		run: vi.fn()
	}
}));

vi.mock('../../db', () => ({
	getDb: () => mockDb,
	schema: { settings: { key: 'key' } }
}));

import { registerSettingsHandlers } from './settings';
import { ipcMain } from 'electron';

function getHandler(channel: string) {
	const calls = vi.mocked(ipcMain.handle).mock.calls;
	const call = calls.find(([ch]) => ch === channel);
	return call?.[1] as ((...args: unknown[]) => unknown) | undefined;
}

describe('settings IPC handlers', () => {
	it('registers GET and SET handlers', () => {
		registerSettingsHandlers();
		expect(vi.mocked(ipcMain.handle)).toHaveBeenCalledWith('settings:get', expect.any(Function));
		expect(vi.mocked(ipcMain.handle)).toHaveBeenCalledWith('settings:set', expect.any(Function));
	});

	it('GET handler returns null when key not found', () => {
		registerSettingsHandlers();
		const handler = getHandler('settings:get');
		mockDb.get.mockReturnValue(null);
		expect(handler?.({} as Event, 'missing-key')).toBeNull();
	});

	it('GET handler returns value when key exists', () => {
		registerSettingsHandlers();
		const handler = getHandler('settings:get');
		mockDb.get.mockReturnValue({ value: 'stored-value' });
		expect(handler?.({} as Event, 'my-key')).toBe('stored-value');
	});

	it('SET handler calls db insert with key and value', () => {
		registerSettingsHandlers();
		const handler = getHandler('settings:set');
		handler?.({} as Event, 'my-key', 'my-value');
		expect(mockDb.values).toHaveBeenCalledWith({ key: 'my-key', value: 'my-value' });
		expect(mockDb.run).toHaveBeenCalled();
	});
});
