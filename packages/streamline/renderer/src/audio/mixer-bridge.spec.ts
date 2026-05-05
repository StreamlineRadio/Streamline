import { describe, it, expect } from 'vitest';

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
