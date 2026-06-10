import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() }, BrowserWindow: vi.fn() }));
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
vi.mock('../../db', () => ({
	getDb: () => mockDb,
	schema: { encoderConfigs: { id: 'id' } }
}));

const { startEncoderMock, stopEncoderMock, getStatusMock } = vi.hoisted(() => ({
	startEncoderMock: vi.fn().mockReturnValue('enc-1'),
	stopEncoderMock: vi.fn(),
	getStatusMock: vi.fn().mockReturnValue({ status: 'idle' })
}));
vi.mock('../../encoders/manager', () => ({
	startEncoder: startEncoderMock,
	stopEncoder: stopEncoderMock,
	getEncoderStatus: getStatusMock
}));

import { registerEncoderHandlers, setEncoderWindow } from './encoder';
import { ipcMain } from 'electron';
import type { EncoderConfig } from '@streamline/shared';

function getHandler(channel: string) {
	const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (...args: unknown[]) => unknown;
}

const fakeWindow = {
	webContents: { send: vi.fn() }
} as unknown as import('electron').BrowserWindow;

describe('encoder IPC handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setEncoderWindow(null);
		registerEncoderHandlers();
	});

	it('ENCODER_LIST_CONFIGS returns all encoder configs', () => {
		mockDb.all.mockReturnValueOnce([{ id: 'e1' }]);
		expect(getHandler('encoder:listConfigs')(null)).toEqual([{ id: 'e1' }]);
	});

	it('ENCODER_SAVE_CONFIG upserts config', () => {
		const config = { id: 'e1', name: 'Test' } as EncoderConfig;
		getHandler('encoder:saveConfig')(null, config);
		expect(mockDb.insert).toHaveBeenCalledOnce();
		expect(mockDb.run).toHaveBeenCalledOnce();
	});

	it('ENCODER_DELETE_CONFIG stops encoder and deletes from db', () => {
		getHandler('encoder:deleteConfig')(null, 'e1');
		expect(stopEncoderMock).toHaveBeenCalledWith('e1');
		expect(mockDb.delete).toHaveBeenCalledOnce();
	});

	it('ENCODER_START throws when no window set', () => {
		expect(() => getHandler('encoder:start')(null, { id: 'e1' } as EncoderConfig)).toThrow(
			'No window available'
		);
	});

	it('ENCODER_START returns id when window is set', () => {
		setEncoderWindow(fakeWindow);
		const result = getHandler('encoder:start')(null, { id: 'e1' } as EncoderConfig);
		expect(result).toEqual({ id: 'enc-1' });
	});

	it('ENCODER_STOP delegates to stopEncoder', () => {
		getHandler('encoder:stop')(null, 'e1');
		expect(stopEncoderMock).toHaveBeenCalledWith('e1');
	});

	it('ENCODER_GET_STATUS delegates to getEncoderStatus', () => {
		getStatusMock.mockReturnValueOnce({
			status: 'streaming',
			bytesEncoded: 0,
			secondsEncoded: 0,
			currentBitrate: 128
		});
		const result = getHandler('encoder:getStatus')(null, 'e1');
		expect(result).toEqual(expect.objectContaining({ status: 'streaming' }));
	});

	it('ENCODER_UPDATE_METADATA is a no-op', async () => {
		const result = await (getHandler('encoder:updateMetadata')(null) as Promise<unknown>);
		expect(result).toBeUndefined();
	});
});
