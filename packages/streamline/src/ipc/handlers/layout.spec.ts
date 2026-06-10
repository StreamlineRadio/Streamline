import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));

const txMock = {
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	onConflictDoUpdate: vi.fn().mockReturnThis(),
	delete: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	run: vi.fn()
};
const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	all: vi.fn().mockReturnValue([]),
	get: vi.fn().mockReturnValue(null),
	transaction: vi.fn((cb: (tx: typeof txMock) => void) => cb(txMock))
};
vi.mock('../../db', () => ({
	getDb: () => mockDb,
	schema: {
		layouts: { id: 'id' },
		moduleInstances: { layoutId: 'layoutId', id: 'id' }
	}
}));

import { registerLayoutHandlers } from './layout';
import { ipcMain } from 'electron';
import type { Layout } from '@streamline/shared';

function getHandler(channel: string) {
	const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (...args: unknown[]) => unknown;
}

function makeLayout(): Layout {
	return {
		id: 'L1',
		name: 'Main',
		isActive: true,
		createdAt: 1000,
		updatedAt: 1000,
		instances: [
			{
				id: 'inst-1',
				layoutId: 'L1',
				moduleId: 'deck',
				title: 'A',
				x: 0,
				y: 0,
				width: 400,
				height: 300,
				zIndex: 1,
				minimized: false,
				settingsJson: '{}'
			}
		]
	};
}

describe('layout IPC handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		registerLayoutHandlers();
	});

	it('LAYOUT_LIST returns all layouts', () => {
		mockDb.all.mockReturnValueOnce([{ id: 'L1', name: 'Main' }]);
		expect(getHandler('layout:list')(null)).toEqual([{ id: 'L1', name: 'Main' }]);
	});

	it('LAYOUT_LOAD returns null when layout not found', () => {
		mockDb.get.mockReturnValueOnce(null);
		expect(getHandler('layout:load')(null, 'L1')).toBeNull();
	});

	it('LAYOUT_LOAD merges layout with its instances', () => {
		const layout = { id: 'L1', name: 'Main', isActive: true, createdAt: 0, updatedAt: 0 };
		const instances = [{ id: 'inst-1', layoutId: 'L1' }];
		mockDb.get.mockReturnValueOnce(layout);
		mockDb.all.mockReturnValueOnce(instances);
		const result = getHandler('layout:load')(null, 'L1') as Layout;
		expect(result.instances).toEqual(instances);
		expect(result.id).toBe('L1');
	});

	it('LAYOUT_SAVE runs a transaction with upsert + instance replacement', () => {
		getHandler('layout:save')(null, makeLayout());
		expect(mockDb.transaction).toHaveBeenCalledOnce();
		expect(txMock.insert).toHaveBeenCalled();
		expect(txMock.delete).toHaveBeenCalled();
	});

	it('LAYOUT_EXPORT throws when layout not found', () => {
		mockDb.get.mockReturnValueOnce(null);
		expect(() => getHandler('layout:export')(null, 'L1')).toThrow('Layout L1 not found');
	});

	it('LAYOUT_EXPORT returns JSON string with instances', () => {
		const layout = { id: 'L1', name: 'Main', isActive: false, createdAt: 0, updatedAt: 0 };
		mockDb.get.mockReturnValueOnce(layout);
		mockDb.all.mockReturnValueOnce([{ id: 'inst-1' }]);
		const json = getHandler('layout:export')(null, 'L1') as string;
		const parsed = JSON.parse(json);
		expect(parsed.instances).toHaveLength(1);
	});

	it('LAYOUT_IMPORT assigns new UUIDs and returns layout', () => {
		const original = makeLayout();
		const json = JSON.stringify(original);
		const result = getHandler('layout:import')(null, json) as Layout;
		expect(result.id).not.toBe(original.id);
		expect(result.instances[0].id).not.toBe(original.instances[0].id);
		expect(result.isActive).toBe(false);
	});
});
