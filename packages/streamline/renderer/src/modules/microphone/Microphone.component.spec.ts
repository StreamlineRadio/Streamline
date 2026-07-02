import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

const { fakeAudioCtx } = vi.hoisted(() => {
	const makeFakeGain = () => ({
		gain: {
			value: 0,
			cancelScheduledValues: vi.fn(),
			setValueAtTime: vi.fn(),
			linearRampToValueAtTime: vi.fn()
		},
		connect: vi.fn(),
		disconnect: vi.fn()
	});

	const fakeAudioCtx = {
		currentTime: 0,
		destination: {},
		createGain: vi.fn().mockImplementation(makeFakeGain),
		createAnalyser: vi.fn().mockReturnValue({
			fftSize: 2048,
			getFloatTimeDomainData: vi.fn((buf: Float32Array) => buf.fill(0)),
			connect: vi.fn(),
			disconnect: vi.fn()
		}),
		createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() })
	};

	return { fakeAudioCtx };
});

vi.mock('../../audio/context', () => ({ getAudioContext: vi.fn().mockReturnValue(fakeAudioCtx) }));
vi.mock('../../audio/mixer-bridge', () => ({
	connectToMaster: vi.fn(),
	connectToBroadcastOnly: vi.fn(),
	getMonitorBus: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() })
}));

import { connectToBroadcastOnly } from '../../audio/mixer-bridge';
import Microphone from './Microphone.svelte';

describe('Microphone', () => {
	beforeEach(() => {
		vi.stubGlobal('requestAnimationFrame', vi.fn());
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi
					.fn()
					.mockResolvedValue([{ kind: 'audioinput', deviceId: 'mic1', label: 'Built-in Mic' }]),
				getUserMedia: vi
					.fn()
					.mockResolvedValue({ getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]) }),
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
	});

	it('renders PTT button', () => {
		const { getByRole } = render(Microphone, { instanceId: 'mic-inst' });
		expect(getByRole('button', { name: 'Hold to talk' })).toBeTruthy();
	});

	it('renders only System Default when no mic devices exist', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi.fn().mockResolvedValue([]),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			},
			configurable: true,
			writable: true
		});
		const { container } = render(Microphone, { instanceId: 'mic-empty' });
		await tick();
		await Promise.resolve();
		await tick();
		const systemDefaultOption = container.querySelector('select option[value=""]');
		expect(systemDefaultOption).toBeTruthy();
	});

	it('shows device select with System Default option', async () => {
		const { getByText } = render(Microphone, { instanceId: 'mic-inst' });
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('System Default')).toBeTruthy();
	});

	it('shows listed microphone devices', async () => {
		const { container } = render(Microphone, { instanceId: 'mic-inst' });
		await tick();
		await Promise.resolve();
		await tick();
		const option = container.querySelector('option[value="mic1"]') as HTMLOptionElement;
		expect(option?.getAttribute('label')).toBe('Built-in Mic');
	});

	it('renders lock button', () => {
		const { getByTitle } = render(Microphone, { instanceId: 'mic-inst' });
		expect(getByTitle('Lock talk on')).toBeTruthy();
	});

	it('uses deviceId as label when device has no label', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi
					.fn()
					.mockResolvedValue([{ kind: 'audioinput', deviceId: 'mic-nolabel', label: '' }]),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			},
			configurable: true,
			writable: true
		});
		const { container } = render(Microphone, { instanceId: 'mic-nl' });
		await tick();
		await Promise.resolve();
		await tick();
		const option = container.querySelector('option[value="mic-nolabel"]') as HTMLOptionElement;
		expect(option?.getAttribute('label')).toBe('mic-nolabel');
	});

	it('PTT button aria-pressed is true when pointer held down', async () => {
		const { getByRole } = render(Microphone, { instanceId: 'mic-inst' });
		const pttButton = getByRole('button', { name: 'Hold to talk' });
		await fireEvent.pointerDown(pttButton);
		await tick();
		await Promise.resolve();
		await tick();
		expect(pttButton.getAttribute('aria-pressed')).toBe('true');
	});

	it('PTT release returns the button to idle', async () => {
		const { getByRole } = render(Microphone, { instanceId: 'mic-ptt-rel' });
		const pttButton = getByRole('button', { name: 'Hold to talk' });
		await fireEvent.pointerDown(pttButton);
		await tick();
		await Promise.resolve();
		await tick();
		await fireEvent.pointerUp(pttButton);
		await tick();
		expect(pttButton.getAttribute('aria-pressed')).toBe('false');
	});

	it('toggles self-monitoring on and off via the monitor button', async () => {
		const { getByTitle } = render(Microphone, { instanceId: 'mic-mon' });
		await fireEvent.click(getByTitle('Hear yourself'));
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByTitle('Stop hearing yourself')).toBeTruthy();
		await fireEvent.click(getByTitle('Stop hearing yourself'));
		await tick();
		expect(getByTitle('Hear yourself')).toBeTruthy();
	});

	it('connects the broadcast gain to the master bus only, not the local monitor mix', () => {
		render(Microphone, { instanceId: 'mic-bus' });
		expect(connectToBroadcastOnly).toHaveBeenCalledTimes(1);
	});

	it('keeps self-monitoring audible while live', async () => {
		const { getByTitle, getByRole } = render(Microphone, { instanceId: 'mic-mon-live' });
		await fireEvent.click(getByTitle('Hear yourself'));
		await tick();
		await Promise.resolve();
		await tick();
		const monitorGain = fakeAudioCtx.createGain.mock.results[1].value;
		monitorGain.gain.linearRampToValueAtTime.mockClear();
		await fireEvent.pointerDown(getByRole('button', { name: 'Hold to talk' }));
		await tick();
		await Promise.resolve();
		await tick();
		expect(monitorGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
	});

	it('mutes self-monitoring while live when toggled off', async () => {
		const { getByTitle, getByRole } = render(Microphone, { instanceId: 'mic-mon-off' });
		await fireEvent.pointerDown(getByRole('button', { name: 'Hold to talk' }));
		await tick();
		await Promise.resolve();
		await tick();
		await fireEvent.click(getByTitle('Hear yourself'));
		await tick();
		await Promise.resolve();
		await tick();
		const monitorGain = fakeAudioCtx.createGain.mock.results[1].value;
		monitorGain.gain.linearRampToValueAtTime.mockClear();
		await fireEvent.click(getByTitle('Stop hearing yourself'));
		await tick();
		expect(monitorGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
	});

	it('toggles talk lock on and off via the lock button', async () => {
		const { getByTitle } = render(Microphone, { instanceId: 'mic-lock' });
		await fireEvent.click(getByTitle('Lock talk on'));
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByTitle('Release talk lock')).toBeTruthy();
		await fireEvent.click(getByTitle('Release talk lock'));
		await tick();
		expect(getByTitle('Lock talk on')).toBeTruthy();
	});

	it('changes the selected input device via the device select', async () => {
		const { container } = render(Microphone, { instanceId: 'mic-dev-change' });
		await vi.waitFor(() => {
			if (!container.querySelector('option[value="mic1"]')) throw new Error('not ready');
		});
		const select = container.querySelector('select') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: 'mic1' } });
		expect(select.value).toBe('mic1');
	});

	it('volume slider input applies audio gain', async () => {
		const { container } = render(Microphone, { instanceId: 'mic-vol' });
		const slider = container.querySelector('#mic-vol-mic-vol') as HTMLInputElement;
		expect(slider).toBeTruthy();
		await fireEvent.input(slider, { target: { value: '0.5' } });
		expect(slider.value).toBe('0.5');
	});
});
