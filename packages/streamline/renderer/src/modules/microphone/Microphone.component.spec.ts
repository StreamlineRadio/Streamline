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
vi.mock('../../audio/mixer-bridge', () => ({ connectToMaster: vi.fn() }));
vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

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

	it('shows device select with System Default option', async () => {
		const { getByText } = render(Microphone, { instanceId: 'mic-inst' });
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('System Default')).toBeTruthy();
	});

	it('shows listed microphone devices', async () => {
		const { getByText } = render(Microphone, { instanceId: 'mic-inst' });
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('Built-in Mic')).toBeTruthy();
	});

	it('renders lock button', () => {
		const { getByTitle } = render(Microphone, { instanceId: 'mic-inst' });
		expect(getByTitle('Lock talk on')).toBeTruthy();
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
});
