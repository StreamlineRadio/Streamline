import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('audio context', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('getAudioContext caches and returns the same instance', async () => {
		const fakeCtx = { state: 'running', resume: vi.fn() };
		vi.stubGlobal('AudioContext', vi.fn().mockReturnValue(fakeCtx));
		const { getAudioContext } = await import('./context');
		const first = getAudioContext();
		const second = getAudioContext();
		expect(first).toBe(second);
		expect(AudioContext).toHaveBeenCalledTimes(1);
	});

	it('resumeAudioContext calls resume() when suspended', async () => {
		const fakeCtx = { state: 'suspended', resume: vi.fn().mockResolvedValue(undefined) };
		vi.stubGlobal('AudioContext', vi.fn().mockReturnValue(fakeCtx));
		const { resumeAudioContext } = await import('./context');
		await resumeAudioContext();
		expect(fakeCtx.resume).toHaveBeenCalledOnce();
	});

	it('resumeAudioContext does not call resume() when running', async () => {
		const fakeCtx = { state: 'running', resume: vi.fn() };
		vi.stubGlobal('AudioContext', vi.fn().mockReturnValue(fakeCtx));
		const { resumeAudioContext } = await import('./context');
		await resumeAudioContext();
		expect(fakeCtx.resume).not.toHaveBeenCalled();
	});
});
