import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('DbMeter', () => {
	let rafCallback: ((now: number) => void) | null = null;
	const rafMock = vi.fn((cb: (now: number) => void) => {
		rafCallback = cb;
		return 1;
	});
	const cafMock = vi.fn();

	function makeAnalyser(samples: Float32Array) {
		return {
			fftSize: samples.length,
			getFloatTimeDomainData: vi.fn((buf: Float32Array) => buf.set(samples))
		} as unknown as AnalyserNode;
	}

	beforeEach(() => {
		rafCallback = null;
		vi.stubGlobal('requestAnimationFrame', rafMock);
		vi.stubGlobal('cancelAnimationFrame', cafMock);
		vi.clearAllMocks();
		rafMock.mockImplementation((cb: (now: number) => void) => {
			rafCallback = cb;
			return 1;
		});
	});

	afterEach(() => vi.unstubAllGlobals());

	it('renders meter-segments container', async () => {
		const analyser = makeAnalyser(new Float32Array([0.5, 0.5]));
		const { container } = render((await import('./DbMeter.svelte')).default, { analyser });
		expect(container.querySelector('.meter-segments')).toBeTruthy();
	});

	it('calls requestAnimationFrame on init', async () => {
		const analyser = makeAnalyser(new Float32Array([0.5, 0.5]));
		render((await import('./DbMeter.svelte')).default, { analyser });
		expect(rafMock).toHaveBeenCalledOnce();
	});

	it('tick computes dbfs from RMS and schedules next frame', async () => {
		const samples = new Float32Array([0.5, 0.5, 0.5, 0.5]);
		const analyser = makeAnalyser(samples);
		render((await import('./DbMeter.svelte')).default, { analyser });
		expect(rafCallback).toBeTruthy();
		rafCallback!(performance.now());
		await tick();
		expect(rafMock).toHaveBeenCalledTimes(2);
	});

	it('peak holds and decays after hold time', async () => {
		const samples = new Float32Array([0.5, 0.5]);
		const analyser = makeAnalyser(samples);
		render((await import('./DbMeter.svelte')).default, { analyser });
		const now = performance.now();
		rafCallback!(now);
		await tick();
		analyser.getFloatTimeDomainData = vi.fn((buf: Float32Array) => buf.fill(0));
		rafCallback!(now + 3000);
		await tick();
		expect(rafMock.mock.calls.length).toBeGreaterThan(2);
	});

	it('cancelAnimationFrame called on destroy', async () => {
		const analyser = makeAnalyser(new Float32Array([0]));
		const { unmount } = render((await import('./DbMeter.svelte')).default, { analyser });
		unmount();
		expect(cafMock).toHaveBeenCalled();
	});
});
