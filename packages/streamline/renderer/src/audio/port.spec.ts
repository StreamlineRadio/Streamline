import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('renderer audio port', () => {
	let listeners: Map<string, (e: Event) => void>;

	beforeEach(async () => {
		vi.resetModules();
		listeners = new Map();
		vi.stubGlobal('window', {
			addEventListener: vi.fn((event: string, cb: (e: Event) => void) => {
				listeners.set(event, cb);
			})
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('initAudioPort registers a streamline-audio-port listener on window', async () => {
		const { initAudioPort } = await import('./port');
		initAudioPort();
		expect(window.addEventListener).toHaveBeenCalledWith(
			'streamline-audio-port',
			expect.any(Function)
		);
	});

	it('getAudioPort returns null before a port is received', async () => {
		const { initAudioPort, getAudioPort } = await import('./port');
		initAudioPort();
		expect(getAudioPort()).toBeNull();
	});

	it('getAudioPort returns the port after receiving a streamline-audio-port event', async () => {
		const { initAudioPort, getAudioPort } = await import('./port');
		initAudioPort();
		const fakePort = { close: vi.fn(), postMessage: vi.fn() };
		const messageEvent = { ports: [fakePort] } as unknown as MessageEvent;
		listeners.get('streamline-audio-port')!(messageEvent);
		expect(getAudioPort()).toBe(fakePort);
	});

	it('initAudioPort closes previous port when a new one arrives', async () => {
		const { initAudioPort, getAudioPort } = await import('./port');
		initAudioPort();
		const port1 = { close: vi.fn(), postMessage: vi.fn() };
		const port2 = { close: vi.fn(), postMessage: vi.fn() };
		listeners.get('streamline-audio-port')!({ ports: [port1] } as unknown as MessageEvent);
		listeners.get('streamline-audio-port')!({ ports: [port2] } as unknown as MessageEvent);
		expect(port1.close).toHaveBeenCalledOnce();
		expect(getAudioPort()).toBe(port2);
	});

	it('ignores a streamline-audio-port event without ports', async () => {
		const { initAudioPort, getAudioPort } = await import('./port');
		initAudioPort();
		listeners.get('streamline-audio-port')!({ ports: [] } as unknown as MessageEvent);
		expect(getAudioPort()).toBeNull();
	});

	it('sendPcm posts message on current port', async () => {
		const { initAudioPort, sendPcm } = await import('./port');
		initAudioPort();
		const fakePort = { close: vi.fn(), postMessage: vi.fn() };
		listeners.get('streamline-audio-port')!({ ports: [fakePort] } as unknown as MessageEvent);
		const buffer = new ArrayBuffer(16);
		sendPcm(buffer, 4, ['enc-1']);
		expect(fakePort.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ buffer, frames: 4, encoderTargets: ['enc-1'] }),
			[buffer]
		);
	});

	it('sendPcm is a no-op when no port is set', async () => {
		const { initAudioPort, sendPcm } = await import('./port');
		initAudioPort();
		expect(() => sendPcm(new ArrayBuffer(4), 1)).not.toThrow();
	});
});
