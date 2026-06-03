import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('getFFmpegPath', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('returns raw ffmpeg-static path in dev mode', async () => {
		vi.doMock('electron', () => ({ app: { isPackaged: false } }));
		vi.doMock('ffmpeg-static', () => ({ default: '/usr/local/bin/ffmpeg' }));
		const { getFFmpegPath } = await import('./ffmpeg-path');
		expect(getFFmpegPath()).toBe('/usr/local/bin/ffmpeg');
	});

	it('replaces app.asar with app.asar.unpacked in packaged mode', async () => {
		vi.doMock('electron', () => ({ app: { isPackaged: true } }));
		vi.doMock('ffmpeg-static', () => ({
			default: '/app/app.asar/node_modules/ffmpeg-static/bin/ffmpeg'
		}));
		const { getFFmpegPath } = await import('./ffmpeg-path');
		expect(getFFmpegPath()).toBe('/app/app.asar.unpacked/node_modules/ffmpeg-static/bin/ffmpeg');
	});

	it('caches the result on repeated calls', async () => {
		vi.doMock('electron', () => ({ app: { isPackaged: false } }));
		vi.doMock('ffmpeg-static', () => ({ default: '/path/ffmpeg' }));
		const { getFFmpegPath } = await import('./ffmpeg-path');
		expect(getFFmpegPath()).toBe(getFFmpegPath());
	});
});
