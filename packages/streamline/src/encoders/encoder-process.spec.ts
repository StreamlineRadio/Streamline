import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

function emitFfmpegStats(proc: ChildProcess) {
	(proc.stderr as unknown as EventEmitter).emit(
		'data',
		Buffer.from('size=128kB time=00:00:01.00 bitrate=125.6kbits/s')
	);
}

describe('EncoderProcess', () => {
	let fakeProcess: ReturnType<typeof makeFakeProcess>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		fakeProcess = makeFakeProcess();
		spawnMock.mockReturnValue(fakeProcess);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('transitions to connecting, then streaming once ffmpeg reports progress', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s.status));
		encoderProcess.start();
		expect(statuses).toContain('connecting');
		expect(statuses).not.toContain('streaming');
		emitFfmpegStats(fakeProcess);
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
		emitFfmpegStats(fakeProcess);
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

	it('schedules a reconnect when a network encoder process emits error', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s.status));
		encoderProcess.start();
		fakeProcess.emit('error', new Error('crash'));
		expect(statuses).toContain('reconnecting');
		expect(statuses).not.toContain('error');
	});

	it('reconnects with exponential backoff on unexpected close', () => {
		const statuses: Array<{ status: string; attempt?: number; delayMs?: number }> = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s as (typeof statuses)[0]));
		encoderProcess.start();
		fakeProcess.emit('close', 1);
		expect(statuses[statuses.length - 1]).toEqual({
			status: 'reconnecting',
			attempt: 1,
			delayMs: 1000
		});
		vi.advanceTimersByTime(1000);
		expect(spawnMock).toHaveBeenCalledTimes(2);
		fakeProcess.emit('close', 1);
		expect(statuses[statuses.length - 1]).toEqual({
			status: 'reconnecting',
			attempt: 2,
			delayMs: 2000
		});
	});

	it('resets backoff after a stable streaming stretch', () => {
		const statuses: Array<{ status: string; delayMs?: number }> = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s as (typeof statuses)[0]));
		encoderProcess.start();
		fakeProcess.emit('close', 1);
		vi.advanceTimersByTime(1000);
		emitFfmpegStats(fakeProcess);
		vi.advanceTimersByTime(30000);
		fakeProcess.emit('close', 1);
		expect(statuses[statuses.length - 1]).toEqual({
			status: 'reconnecting',
			attempt: 1,
			delayMs: 1000
		});
	});

	it('gives up with an error when it never streamed after max attempts', () => {
		const statuses: Array<{ status: string; error?: string }> = [];
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.setStatusListener((s) => statuses.push(s as (typeof statuses)[0]));
		encoderProcess.start();
		for (let attempt = 0; attempt < 5; attempt++) {
			fakeProcess.emit('close', 1);
			vi.advanceTimersByTime(30000);
		}
		fakeProcess.emit('close', 1);
		const finalStatus = statuses[statuses.length - 1];
		expect(finalStatus.status).toBe('error');
		expect(finalStatus.error).toContain('Could not connect after 5 attempts');
		expect(spawnMock).toHaveBeenCalledTimes(6);
	});

	it('ignores events from a replaced ffmpeg process', () => {
		const staleProcess = fakeProcess;
		const freshProcess = makeFakeProcess();
		spawnMock.mockReturnValueOnce(staleProcess).mockReturnValueOnce(freshProcess);
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.start();
		staleProcess.emit('close', 1);
		vi.advanceTimersByTime(1000);
		emitFfmpegStats(freshProcess);
		staleProcess.emit('close', 1);
		expect(encoderProcess.status.status).toBe('streaming');
	});

	it('stop() during reconnect cancels the pending restart', () => {
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.start();
		fakeProcess.emit('close', 1);
		encoderProcess.stop();
		vi.advanceTimersByTime(60000);
		expect(spawnMock).toHaveBeenCalledTimes(1);
	});

	it('sets error status on unexpected close for file encoders', () => {
		const statuses: string[] = [];
		const encoderProcess = new EncoderProcess(
			makeConfig({ type: 'file', pathTemplate: '/rec/{date}' } as unknown as EncoderConfig),
			() => null
		);
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
		emitFfmpegStats(fakeProcess);
		expect(encoderProcess.status.status).toBe('streaming');
	});

	it('logs debug on stderr data event', () => {
		const encoderProcess = new EncoderProcess(makeConfig(), () => null);
		encoderProcess.start();
		(fakeProcess.stderr as unknown as EventEmitter).emit('data', Buffer.from('ffmpeg output'));
		expect(vi.mocked(log.debug)).toHaveBeenCalledWith('ffmpeg', 'ffmpeg output');
	});
});
