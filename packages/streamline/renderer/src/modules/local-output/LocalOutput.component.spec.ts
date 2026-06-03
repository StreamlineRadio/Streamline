import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

const { fakeGainNode, fakeAudioCtx } = vi.hoisted(() => {
	const fakeGainNode = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
	const fakeAudioCtx = {
		createGain: vi.fn().mockReturnValue(fakeGainNode),
		createMediaStreamDestination: vi.fn().mockReturnValue({ stream: {}, disconnect: vi.fn() })
	};
	return { fakeGainNode, fakeAudioCtx };
});

vi.mock('../../audio/context', () => ({ getAudioContext: vi.fn().mockReturnValue(fakeAudioCtx) }));
vi.mock('../../audio/mixer-bridge', () => ({
	getMasterBus: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() })
}));

import LocalOutput from './LocalOutput.svelte';

describe('LocalOutput', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'Audio',
			vi.fn().mockReturnValue({
				play: vi.fn().mockResolvedValue(undefined),
				pause: vi.fn(),
				srcObject: null
			})
		);
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi
					.fn()
					.mockResolvedValue([{ kind: 'audiooutput', deviceId: 'dev1', label: 'Speakers' }]),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			},
			configurable: true,
			writable: true
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		fakeGainNode.gain.value = 0;
	});

	it('renders "System Default" option', async () => {
		const { getByText } = render(LocalOutput, { instanceId: 'lo-1' });
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('System Default')).toBeTruthy();
	});

	it('renders listed audio output devices', async () => {
		const { getByText } = render(LocalOutput, { instanceId: 'lo-1' });
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('Speakers')).toBeTruthy();
	});

	it('renders volume slider', () => {
		const { container } = render(LocalOutput, { instanceId: 'lo-1' });
		expect(container.querySelector('input[type="range"]')).toBeTruthy();
	});

	it('updates gain on volume slider input', async () => {
		const { container } = render(LocalOutput, { instanceId: 'lo-1' });
		const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
		await fireEvent.input(slider, { target: { value: '0.5' } });
		expect(fakeGainNode.gain.value).toBe(0.5);
	});
});
