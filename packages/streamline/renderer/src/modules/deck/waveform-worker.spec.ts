import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('waveform-worker', () => {
	let onmessageHandler: (
		e: MessageEvent<{ arrayBuffer: ArrayBuffer; hash: string; pixelWidth: number }>
	) => void;
	const postMessageMock = vi.fn();

	beforeEach(async () => {
		vi.resetModules();
		postMessageMock.mockClear();
		const fakeDecoded = {
			length: 4,
			numberOfChannels: 1,
			getChannelData: vi.fn().mockReturnValue(new Float32Array([0.5, -0.5, 0.25, -0.25]))
		};
		vi.stubGlobal('self', {
			set onmessage(cb: typeof onmessageHandler) {
				onmessageHandler = cb;
			},
			postMessage: postMessageMock
		});
		vi.stubGlobal(
			'OfflineAudioContext',
			vi.fn().mockReturnValue({
				decodeAudioData: vi.fn().mockResolvedValue(fakeDecoded)
			})
		);
		await import('./waveform-worker');
	});

	afterEach(() => vi.unstubAllGlobals());

	it('computes peak values and posts back { peaks, hash }', async () => {
		const buffer = new ArrayBuffer(4);
		onmessageHandler!({
			data: { arrayBuffer: buffer, hash: 'abc', pixelWidth: 2 }
		} as MessageEvent<{ arrayBuffer: ArrayBuffer; hash: string; pixelWidth: number }>);
		await new Promise((r) => setTimeout(r, 0));
		expect(postMessageMock).toHaveBeenCalledWith(
			expect.objectContaining({ peaks: expect.any(Array), hash: 'abc' })
		);
	});

	it('posts { peaks: null, error } on decodeAudioData failure', async () => {
		vi.stubGlobal(
			'OfflineAudioContext',
			vi.fn().mockReturnValue({
				decodeAudioData: vi.fn().mockRejectedValue(new Error('bad audio'))
			})
		);
		const buffer = new ArrayBuffer(4);
		onmessageHandler!({
			data: { arrayBuffer: buffer, hash: 'xyz', pixelWidth: 2 }
		} as MessageEvent<{ arrayBuffer: ArrayBuffer; hash: string; pixelWidth: number }>);
		await new Promise((r) => setTimeout(r, 0));
		expect(postMessageMock).toHaveBeenCalledWith(
			expect.objectContaining({ peaks: null, hash: 'xyz', error: expect.any(String) })
		);
	});
});
