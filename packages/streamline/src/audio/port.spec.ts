import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('../logging', () => ({ log: { info: vi.fn() } }));

const { handlePcmMessageMock } = vi.hoisted(() => ({ handlePcmMessageMock: vi.fn() }));
vi.mock('./pcm-receiver', () => ({ handlePcmMessage: handlePcmMessageMock }));

const channelRef = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('electron', () => ({
	MessageChannelMain: vi.fn(() => channelRef.current),
	BrowserWindow: vi.fn()
}));

function makePort() {
	const port = new EventEmitter();
	return Object.assign(port, { start: vi.fn(), close: vi.fn() });
}

function makeChannel() {
	return { port1: makePort(), port2: makePort() };
}

describe('createAudioPort', () => {
	let didFinishLoad: (() => void) | undefined;
	let mockWebContents: { on: ReturnType<typeof vi.fn>; postMessage: ReturnType<typeof vi.fn> };
	let mockWindow: { webContents: typeof mockWebContents };

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();
		didFinishLoad = undefined;
		channelRef.current = makeChannel();
		mockWebContents = {
			on: vi.fn((event: string, cb: () => void) => {
				if (event === 'did-finish-load') didFinishLoad = cb;
			}),
			postMessage: vi.fn()
		};
		mockWindow = { webContents: mockWebContents };
	});

	it('registers a did-finish-load listener', async () => {
		const { createAudioPort } = await import('./port');
		createAudioPort(mockWindow as unknown as import('electron').BrowserWindow);
		expect(mockWebContents.on).toHaveBeenCalledWith('did-finish-load', expect.any(Function));
	});

	it('is idempotent — second call does not register another listener', async () => {
		const { createAudioPort } = await import('./port');
		createAudioPort(mockWindow as unknown as import('electron').BrowserWindow);
		createAudioPort(mockWindow as unknown as import('electron').BrowserWindow);
		expect(mockWebContents.on).toHaveBeenCalledTimes(1);
	});

	it('starts port1 and transfers port2 on did-finish-load', async () => {
		const { createAudioPort } = await import('./port');
		createAudioPort(mockWindow as unknown as import('electron').BrowserWindow);
		const channel = channelRef.current as ReturnType<typeof makeChannel>;
		didFinishLoad!();
		expect(channel.port1.start).toHaveBeenCalledOnce();
		expect(mockWebContents.postMessage).toHaveBeenCalledWith('audio:port', null, expect.any(Array));
	});

	it('calls handlePcmMessage when message with ArrayBuffer arrives', async () => {
		const { createAudioPort } = await import('./port');
		createAudioPort(mockWindow as unknown as import('electron').BrowserWindow);
		const channel = channelRef.current as ReturnType<typeof makeChannel>;
		didFinishLoad!();

		const buffer = new ArrayBuffer(16);
		channel.port1.emit('message', { data: { buffer } });
		expect(handlePcmMessageMock).toHaveBeenCalledWith({ buffer });
	});

	it('ignores messages without an ArrayBuffer', async () => {
		const { createAudioPort } = await import('./port');
		createAudioPort(mockWindow as unknown as import('electron').BrowserWindow);
		const channel = channelRef.current as ReturnType<typeof makeChannel>;
		didFinishLoad!();

		channel.port1.emit('message', { data: { buffer: 'not-a-buffer' } });
		expect(handlePcmMessageMock).not.toHaveBeenCalled();

		channel.port1.emit('message', { data: null });
		expect(handlePcmMessageMock).not.toHaveBeenCalled();
	});

	it('closes previous port on reload', async () => {
		const { createAudioPort } = await import('./port');
		createAudioPort(mockWindow as unknown as import('electron').BrowserWindow);
		const firstChannel = channelRef.current as ReturnType<typeof makeChannel>;
		didFinishLoad!();

		channelRef.current = makeChannel();
		didFinishLoad!();
		expect(firstChannel.port1.close).toHaveBeenCalledOnce();
	});
});
