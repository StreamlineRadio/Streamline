import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('electron', () => ({ app: { isPackaged: false } }));
vi.mock('ffmpeg-static', () => ({ default: '/fake/ffmpeg' }));
vi.mock('../logging', () => ({
	log: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock('child_process', () => ({ spawn: spawnMock }));

import type { EncoderConfig } from '@streamline/shared';
import { EncoderProcess } from './encoder-process';
import { log } from '../logging';

function makeConfig(overrides: Partial<EncoderConfig> = {}): EncoderConfig {
	return {
		id: 'enc-1',
		name: 'Test',
		type: 'icecast',
		format: 'mp3',
		bitrateKbps: 128,
		sampleRate: 44100,
		channels: 2,
		host: 'localhost',
		port: 8000,
		mount: '/stream',
		...overrides
	} as EncoderConfig;
}

function makeFakeProcess() {
	const proc = new EventEmitter() as unknown as ChildProcess;
	(proc as unknown as Record<string, unknown>).stdin = {
		writable: true,
		write: vi.fn(),
		end: vi.fn()
	};
	(proc as unknown as Record<string, unknown>).stderr = new EventEmitter();
	(proc as unknown as Record<string, unknown>).kill = vi.fn();
	return proc as ChildProcess & {
		stdin: { writable: boolean; write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
		kill: ReturnType<typeof vi.fn>;
	};
}

describe('EncoderProcess', () => {
	let fakeProcess: ReturnType<typeof makeFakeProcess>;

	beforeEach(() => {
		vi.clearAllMocks();
		fakeProcess = makeFakeProcess();
		spawnMock.mockReturnValue(fakeProcess);
	});

	it('transitions to connecting then streaming status on start()', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s.status));
		encoderProcess.start();
		expect(statuses).toContain('connecting');
		expect(statuses).toContain('streaming');
	});

	it('is a no-op if start() called while already running', () => {
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.start();
		encoderProcess.start();
		expect(spawnMock).toHaveBeenCalledTimes(1);
	});

	it('builds icecast URL with password from getPassword', () => {
		const encoderProcess = new EncoderProcess(makeConfig(), () => 'secret123');
		encoderProcess.start();
		const spawnArgs: string[] = spawnMock.mock.calls[0][1];
		expect(spawnArgs.some((a) => a.includes('secret123'))).toBe(true);
		expect(spawnArgs.some((a) => a.includes('icecast://'))).toBe(true);
	});

	it('builds file path for type=file config', () => {
		const encoderProcess = new EncoderProcess(
			makeConfig({
				type: 'file',
				pathTemplate: '/recordings/{date}-{format}'
			} as unknown as EncoderConfig),
			() => null
		);
		encoderProcess.start();
		const spawnArgs: string[] = spawnMock.mock.calls[0][1];
		const pathArg = spawnArgs[spawnArgs.length - 1];
		expect(pathArg).toMatch(/\/recordings\/\d{4}-\d{2}-\d{2}-mp3/);
	});

	it('write() updates bytesEncoded in status', () => {
		const statuses: Array<{ status: string; bytesEncoded?: number }> = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s as (typeof statuses)[0]));
		encoderProcess.start();
		encoderProcess.write(new ArrayBuffer(1024));
		const streamingStatuses = statuses.filter((s) => s.status === 'streaming');
		const streamingStatus = streamingStatuses[streamingStatuses.length - 1];
		expect(streamingStatus?.bytesEncoded).toBe(1024);
	});

	it('write() is a no-op when not running', () => {
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.write(new ArrayBuffer(100));
		expect(fakeProcess.stdin.write).not.toHaveBeenCalled();
	});

	it('stop() sets status to stopped and kills process', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s.status));
		encoderProcess.start();
		encoderProcess.stop();
		expect(statuses).toContain('stopped');
		expect(fakeProcess.kill).toHaveBeenCalledWith('SIGTERM');
	});

	it('sets error status when process emits error event', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s.status));
		encoderProcess.start();
		fakeProcess.emit('error', new Error('crash'));
		expect(statuses).toContain('error');
	});

	it('sets error status on unexpected close', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s.status));
		encoderProcess.start();
		fakeProcess.emit('close', 1);
		expect(statuses).toContain('error');
	});

	it('does not set error on close after stop()', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s.status));
		encoderProcess.start();
		encoderProcess.stop();
		fakeProcess.emit('close', 0);
		expect(statuses.filter((s) => s === 'error')).toHaveLength(0);
	});

	it('status getter returns current status', () => {
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		expect(encoderProcess.status).toEqual({ status: 'idle' });
		encoderProcess.start();
		expect(encoderProcess.status.status).toBe('streaming');
	});

	it('logs debug on stderr data event', () => {
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.start();
		(fakeProcess.stderr as unknown as EventEmitter).emit('data', Buffer.from('ffmpeg output'));
		expect(vi.mocked(log.debug)).toHaveBeenCalledWith('ffmpeg', 'ffmpeg output');
	});
});
