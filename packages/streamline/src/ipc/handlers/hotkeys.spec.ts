import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));

const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	all: vi.fn().mockReturnValue([]),
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	onConflictDoUpdate: vi.fn().mockReturnThis(),
	delete: vi.fn().mockReturnThis(),
	run: vi.fn()
};
vi.mock('../../db', () => ({ getDb: () => mockDb, schema: { hotkeys: { id: 'id' } } }));

import { registerHotkeyHandlers } from './hotkeys';
import { ipcMain } from 'electron';
import type { HotkeyBinding } from '@streamline/shared';

function getHandler(channel: string) {
	const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (...args: unknown[]) => unknown;
}

describe('hotkey IPC handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		registerHotkeyHandlers();
	});

	it('HOTKEY_LIST returns all hotkeys', () => {
		const bindings = [{ id: 'h1', instanceId: 'i1', action: 'play', accelerator: 'F1' }];
		mockDb.all.mockReturnValueOnce(bindings);
		expect(getHandler('hotkey:list')(null)).toEqual(bindings);
	});

	it('HOTKEY_SAVE upserts binding', async () => {
		const binding: HotkeyBinding = {
			id: 'h1',
			instanceId: 'i1',
			action: 'play',
			accelerator: 'F1'
		};
		await getHandler('hotkey:save')(null, binding);
		expect(mockDb.insert).toHaveBeenCalledOnce();
		expect(mockDb.run).toHaveBeenCalledOnce();
	});

	it('HOTKEY_DELETE deletes by id', async () => {
		await getHandler('hotkey:delete')(null, 'h1');
		expect(mockDb.delete).toHaveBeenCalledOnce();
		expect(mockDb.run).toHaveBeenCalledOnce();
	});
});
