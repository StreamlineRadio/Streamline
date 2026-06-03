import { describe, it, expect, vi } from 'vitest';

vi.mock('./context', () => ({ getAudioContext: vi.fn() }));
vi.mock('./port', () => ({ sendPcm: vi.fn() }));
vi.mock('@streamline/audio-worklet', () => ({ TAP_PROCESSOR_NAME: 'tap-processor' }));
vi.mock('@streamline/audio-worklet/tap-processor?url', () => ({ default: 'tap-url' }));

import { getMasterBus, connectToMaster, setMasterVolume } from './mixer-bridge';

function buildTanhCurve(size = 256): Float32Array {
	const curve = new Float32Array(size);
	for (let i = 0; i < size; i++) {
		const x = (i * 2) / (size - 1) - 1;
		curve[i] = Math.tanh(x * 2);
	}
	return curve;
}

describe('soft-clip tanh curve', () => {
	it('is monotonically increasing', () => {
		const curve = buildTanhCurve();
		for (let i = 1; i < curve.length; i++) {
			expect(curve[i]).toBeGreaterThanOrEqual(curve[i - 1]);
		}
	});

	it('clamps output to [-1, 1]', () => {
		const curve = buildTanhCurve();
		expect(curve[0]).toBeGreaterThanOrEqual(-1);
		expect(curve[curve.length - 1]).toBeLessThanOrEqual(1);
	});

	it('maps center to 0', () => {
		const curve = buildTanhCurve();
		const mid = Math.floor(curve.length / 2);
		expect(Math.abs(curve[mid])).toBeLessThan(0.01);
	});
});

describe('mixer-bridge module', () => {
	it('getMasterBus throws when mixer not initialized', () => {
		expect(() => getMasterBus()).toThrow('Mixer not initialized');
	});

	it('connectToMaster throws when mixer not initialized', () => {
		const fakeNode = { connect: vi.fn() } as unknown as AudioNode;
		expect(() => connectToMaster(fakeNode)).toThrow('Mixer not initialized');
	});

	it('setMasterVolume is a no-op when masterBus is null', () => {
		expect(() => setMasterVolume(0.5)).not.toThrow();
	});
});
