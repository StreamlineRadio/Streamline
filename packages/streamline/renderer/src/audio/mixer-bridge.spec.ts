import { describe, it, expect, vi } from 'vitest';

vi.mock('./context', () => ({ getAudioContext: vi.fn() }));
vi.mock('./port', () => ({ sendPcm: vi.fn() }));
vi.mock('@streamline/audio-worklet', () => ({ TAP_PROCESSOR_NAME: 'tap-processor' }));
vi.mock('@streamline/audio-worklet/tap-processor?url', () => ({ default: 'tap-url' }));

import {
	getMasterBus,
	getMonitorBus,
	connectToMaster,
	connectToBroadcastOnly,
	setMasterVolume
} from './mixer-bridge';

describe('mixer-bridge module', () => {
	it('getMasterBus throws when mixer not initialized', () => {
		expect(() => getMasterBus()).toThrow('Mixer not initialized');
	});

	it('getMonitorBus throws when mixer not initialized', () => {
		expect(() => getMonitorBus()).toThrow('Mixer not initialized');
	});

	it('connectToMaster throws when mixer not initialized', () => {
		const fakeNode = { connect: vi.fn() } as unknown as AudioNode;
		expect(() => connectToMaster(fakeNode)).toThrow('Mixer not initialized');
	});

	it('connectToBroadcastOnly throws when mixer not initialized', () => {
		const fakeNode = { connect: vi.fn() } as unknown as AudioNode;
		expect(() => connectToBroadcastOnly(fakeNode)).toThrow('Mixer not initialized');
	});

	it('setMasterVolume is a no-op when masterBus is null', () => {
		expect(() => setMasterVolume(0.5)).not.toThrow();
	});
});
