import { describe, it, expect, vi, beforeEach } from 'vitest';

const { encryptStringMock, decryptStringMock, isAvailableMock } = vi.hoisted(() => ({
	encryptStringMock: vi.fn().mockReturnValue(Buffer.from('encrypted')),
	decryptStringMock: vi.fn().mockReturnValue('plaintext'),
	isAvailableMock: vi.fn().mockReturnValue(true)
}));

vi.mock('electron', () => ({
	ipcMain: { handle: vi.fn() },
	safeStorage: {
		isEncryptionAvailable: isAvailableMock,
		encryptString: encryptStringMock,
		decryptString: decryptStringMock
	}
}));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => 'eq-clause') }));
vi.mock('../../logging', () => ({ log: { warn: vi.fn() } }));

const mockDb = {
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	get: vi.fn().mockReturnValue(null),
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	onConflictDoUpdate: vi.fn().mockReturnThis(),
	delete: vi.fn().mockReturnThis(),
	run: vi.fn()
};
vi.mock('../../db', () => ({ getDb: () => mockDb, schema: { secrets: { ref: 'ref' } } }));

import { registerSecretHandlers, getSecret } from './secret';
import { ipcMain } from 'electron';
import { log } from '../../logging';

function getHandler(channel: string) {
	const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (...args: unknown[]) => unknown;
}

describe('secret IPC handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isAvailableMock.mockReturnValue(true);
		encryptStringMock.mockReturnValue(Buffer.from('encrypted'));
		registerSecretHandlers();
	});

	it('SECRET_SET encrypts and upserts the value', () => {
		getHandler('secret:set')(null, 'pw-ref', 'hunter2');
		expect(encryptStringMock).toHaveBeenCalledWith('hunter2');
		expect(mockDb.insert).toHaveBeenCalledOnce();
		expect(mockDb.run).toHaveBeenCalledOnce();
	});

	it('SECRET_SET logs warning when encryption unavailable', () => {
		isAvailableMock.mockReturnValue(false);
		getHandler('secret:set')(null, 'ref', 'val');
		expect(encryptStringMock).toHaveBeenCalled();
		expect(vi.mocked(log.warn)).toHaveBeenCalledWith(expect.stringContaining('safeStorage'));
	});

	it('SECRET_DELETE deletes by ref', () => {
		getHandler('secret:delete')(null, 'pw-ref');
		expect(mockDb.delete).toHaveBeenCalledOnce();
		expect(mockDb.run).toHaveBeenCalledOnce();
	});

	it('getSecret returns null when ref not found', () => {
		mockDb.get.mockReturnValueOnce(null);
		expect(getSecret('pw-ref')).toBeNull();
	});

	it('getSecret decrypts and returns string', () => {
		mockDb.get.mockReturnValueOnce({ ref: 'pw-ref', encryptedBlob: Buffer.from('encrypted') });
		decryptStringMock.mockReturnValue('plaintext');
		expect(getSecret('pw-ref')).toBe('plaintext');
	});
});
