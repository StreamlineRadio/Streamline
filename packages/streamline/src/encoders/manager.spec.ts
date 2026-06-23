import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({ BrowserWindow: vi.fn(), ipcMain: { handle: vi.fn() } }));
vi.mock('../logging', () => ({ log: { info: vi.fn() } }));

const {
	mockEncoderStart,
	mockEncoderStop,
	mockEncoderWrite,
	mockEncoderStatus,
	capturedStatusListeners
} = vi.hoisted(() => ({
	mockEncoderStart: vi.fn(),
	mockEncoderStop: vi.fn(),
	mockEncoderWrite: vi.fn(),
	mockEncoderStatus: vi.fn().mockReturnValue({ status: 'idle' }),
	capturedStatusListeners: [] as Array<(s: import('@streamline/shared').EncoderStatus) => void>
}));

vi.mock('./encoder-process', () => ({
	EncoderProcess: vi.fn().mockImplementation(() => ({
		start: mockEncoderStart,
		stop: mockEncoderStop,
		write: mockEncoderWrite,
		setStatusListener: vi
			.fn()
			.mockImplementation((cb: (s: import('@streamline/shared').EncoderStatus) => void) => {
				capturedStatusListeners.push(cb);
			}),
		get status() {
			return mockEncoderStatus();
		}
	}))
}));

vi.mock('../audio/pcm-receiver', () => ({
	registerEncoderConsumer: vi.fn(),
	unregisterEncoderConsumer: vi.fn()
}));

vi.mock('../ipc/handlers/secret', () => ({ getSecret: vi.fn().mockReturnValue('pw') }));

import { startEncoder, stopEncoder, getEncoderStatus, isAnyEncoderStreaming } from './manager';
import { EncoderProcess } from './encoder-process';
import { registerEncoderConsumer, unregisterEncoderConsumer } from '../audio/pcm-receiver';
import type { EncoderConfig } from '@streamline/shared';

const fakeWindow = {
	webContents: { send: vi.fn() }
} as unknown as import('electron').BrowserWindow;

function makeConfig(id = 'enc-1'): EncoderConfig {
	return {
		id,
		name: 'Test',
		type: 'icecast',
		format: 'mp3',
		bitrateKbps: 128,
		sampleRate: 44100,
		channels: 2,
		host: 'localhost',
		port: 8000,
		mount: '/stream',
		passwordRef: 'ref-1'
	} as EncoderConfig;
}

describe('encoder manager', () => {
	beforeEach(() => {
		stopEncoder('enc-1');
		stopEncoder('enc-2');
		capturedStatusListeners.length = 0;
		vi.clearAllMocks();
	});

	it('startEncoder creates process, registers PCM consumer, starts it', () => {
		startEncoder(makeConfig(), fakeWindow);
		expect(mockEncoderStart).toHaveBeenCalledOnce();
		expect(registerEncoderConsumer).toHaveBeenCalledWith('enc-1', expect.any(Function));
	});

	it('registered PCM consumer forwards buffers to the encoder process', () => {
		startEncoder(makeConfig(), fakeWindow);
		const consumer = vi.mocked(registerEncoderConsumer).mock.calls[0][1];
		const buffer = new ArrayBuffer(8);
		consumer(buffer);
		expect(mockEncoderWrite).toHaveBeenCalledWith(buffer);
	});

	it('startEncoder stops existing process before creating a new one', () => {
		startEncoder(makeConfig(), fakeWindow);
		startEncoder(makeConfig(), fakeWindow);
		expect(unregisterEncoderConsumer).toHaveBeenCalledWith('enc-1');
		expect(mockEncoderStop).toHaveBeenCalledOnce();
	});

	it('stopEncoder unregisters consumer and stops process', () => {
		startEncoder(makeConfig(), fakeWindow);
		stopEncoder('enc-1');
		expect(unregisterEncoderConsumer).toHaveBeenCalledWith('enc-1');
		expect(mockEncoderStop).toHaveBeenCalledOnce();
	});

	it('stopEncoder is a no-op for unknown id', () => {
		stopEncoder('unknown');
		expect(mockEncoderStop).not.toHaveBeenCalled();
	});

	it('getEncoderStatus returns idle for unknown id', () => {
		expect(getEncoderStatus('unknown')).toEqual({ status: 'idle' });
	});

	it('getEncoderStatus returns process status for known id', () => {
		mockEncoderStatus.mockReturnValue({
			status: 'streaming',
			bytesEncoded: 0,
			secondsEncoded: 0,
			currentBitrate: 128
		});
		startEncoder(makeConfig('enc-2'), fakeWindow);
		expect(getEncoderStatus('enc-2')).toEqual(expect.objectContaining({ status: 'streaming' }));
	});

	it('isAnyEncoderStreaming is false when no encoder is running', () => {
		expect(isAnyEncoderStreaming()).toBe(false);
	});

	it('isAnyEncoderStreaming is true when a running encoder is streaming', () => {
		mockEncoderStatus.mockReturnValue({ status: 'streaming' });
		startEncoder(makeConfig(), fakeWindow);
		expect(isAnyEncoderStreaming()).toBe(true);
	});

	it('isAnyEncoderStreaming is false when the running encoder is not streaming', () => {
		mockEncoderStatus.mockReturnValue({ status: 'connecting' });
		startEncoder(makeConfig(), fakeWindow);
		expect(isAnyEncoderStreaming()).toBe(false);
	});

	it('status listener fires webContents.send when status changes', () => {
		startEncoder(makeConfig(), fakeWindow);
		const listener = capturedStatusListeners[capturedStatusListeners.length - 1];
		listener({ status: 'streaming', bytesEncoded: 0, secondsEncoded: 0, currentBitrate: 128 });
		expect(fakeWindow.webContents.send).toHaveBeenCalledWith(
			expect.any(String),
			'enc-1',
			expect.objectContaining({ status: 'streaming' })
		);
	});

	it('startEncoder passes null password when config has no passwordRef', () => {
		const fileConfig = {
			id: 'enc-file',
			name: 'File',
			type: 'file',
			format: 'mp3',
			bitrateKbps: 128,
			sampleRate: 44100,
			channels: 2,
			pathTemplate: '/tmp/recording.mp3'
		} as import('@streamline/shared').EncoderConfig;
		startEncoder(fileConfig, fakeWindow);
		expect(mockEncoderStart).toHaveBeenCalledOnce();
		const calls = vi.mocked(EncoderProcess).mock.calls;
		const passwordCallback = calls[calls.length - 1]![1];
		expect(passwordCallback()).toBeNull();
	});
});
