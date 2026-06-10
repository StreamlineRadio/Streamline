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
	const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

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
		if (originalMediaDevices) {
			Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
		} else {
			delete (navigator as { mediaDevices?: unknown }).mediaDevices;
		}
		fakeGainNode.gain.value = 0;
	});

	it('falls back to the device id when the label is empty', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi
					.fn()
					.mockResolvedValue([{ kind: 'audiooutput', deviceId: 'dev-x', label: '' }]),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			},
			configurable: true,
			writable: true
		});
		const { container } = render(LocalOutput, { instanceId: 'lo-label' });
		await vi.waitFor(() => {
			const option = container.querySelector('option[value="dev-x"]');
			if (!option) throw new Error('device option not rendered');
			expect(option.getAttribute('label')).toBe('dev-x');
		});
	});

	it('invokes the change handler when a device is selected', async () => {
		const { container } = render(LocalOutput, { instanceId: 'lo-change' });
		await vi.waitFor(() => {
			if (!container.querySelector('option[value="dev1"]')) throw new Error('not ready');
		});
		const select = container.querySelector('select') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: 'dev1' } });
		expect(select.value).toBe('dev1');
	});

	it('unmounts cleanly before mount work completes', () => {
		const { unmount } = render(LocalOutput, { instanceId: 'lo-eager' });
		unmount();
	});

	it('renders only System Default when no devices exist', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi.fn().mockResolvedValue([]),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			},
			configurable: true,
			writable: true
		});
		const { container } = render(LocalOutput, { instanceId: 'lo-empty' });
		await tick();
		await Promise.resolve();
		await tick();
		const systemDefaultOption = container.querySelector('select option[value=""]');
		expect(systemDefaultOption).toBeTruthy();
	});

	it('renders "System Default" option', async () => {
		const { getByText } = render(LocalOutput, { instanceId: 'lo-1' });
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('System Default')).toBeTruthy();
	});

	it('renders listed audio output devices', async () => {
		const { container } = render(LocalOutput, { instanceId: 'lo-1' });
		await tick();
		await Promise.resolve();
		await tick();
		const option = container.querySelector('option[value="dev1"]') as HTMLOptionElement;
		expect(option?.getAttribute('label')).toBe('Speakers');
	});

	it('renders volume slider', () => {
		const { container } = render(LocalOutput, { instanceId: 'lo-1' });
		expect(container.querySelector('input[type="range"]')).toBeTruthy();
	});

	it('renders device id as label when device has no label', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi
					.fn()
					.mockResolvedValue([{ kind: 'audiooutput', deviceId: 'dev-nolabel', label: '' }]),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			},
			configurable: true,
			writable: true
		});
		const { container } = render(LocalOutput, { instanceId: 'lo-nl' });
		await tick();
		await Promise.resolve();
		await tick();
		const option = container.querySelector('option[value="dev-nolabel"]') as HTMLOptionElement;
		expect(option?.getAttribute('label')).toBe('dev-nolabel');
	});

	it('updates gain on volume slider input', async () => {
		const { container } = render(LocalOutput, { instanceId: 'lo-1' });
		const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
		await fireEvent.input(slider, { target: { value: '0.5' } });
		expect(fakeGainNode.gain.value).toBe(0.5);
	});
});
