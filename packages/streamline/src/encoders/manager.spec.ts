import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({ BrowserWindow: vi.fn(), ipcMain: { handle: vi.fn() } }));
vi.mock('../logging', () => ({ log: { info: vi.fn() } }));

const { mockEncoderStart, mockEncoderStop, mockEncoderStatus, capturedStatusListeners } =
	vi.hoisted(() => ({
		mockEncoderStart: vi.fn(),
		mockEncoderStop: vi.fn(),
		mockEncoderStatus: vi.fn().mockReturnValue({ status: 'idle' }),
		capturedStatusListeners: [] as Array<(s: import('@streamline/shared').EncoderStatus) => void>
	}));

vi.mock('./encoder-process', () => ({
	EncoderProcess: vi.fn().mockImplementation(() => ({
		start: mockEncoderStart,
		stop: mockEncoderStop,
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

import { startEncoder, stopEncoder, getEncoderStatus } from './manager';
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
	});
});
