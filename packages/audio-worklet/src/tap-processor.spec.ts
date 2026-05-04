import { describe, it, expect } from 'vitest';

function interleave(left: Float32Array, right: Float32Array): Float32Array {
	const out = new Float32Array(left.length * 2);
	for (let i = 0; i < left.length; i++) {
		out[i * 2] = left[i];
		out[i * 2 + 1] = right[i];
	}
	return out;
}

describe('tap processor interleave math', () => {
	it('interleaves L/R correctly', () => {
		const left = new Float32Array([0.1, 0.2, 0.3]);
		const right = new Float32Array([0.4, 0.5, 0.6]);
		const result = interleave(left, right);
		const expected = [0.1, 0.4, 0.2, 0.5, 0.3, 0.6];
		for (let i = 0; i < expected.length; i++) {
			expect(result[i]).toBeCloseTo(expected[i], 5);
		}
	});

	it('produces correct batch size', () => {
		const BATCH = 960;
		const buffer = new Float32Array(BATCH * 2);
		expect(buffer.byteLength).toBe(BATCH * 2 * 4);
	});

	it('slice creates a copy with same content', () => {
		const arr = new Float32Array([1.0, 2.0, 3.0]);
		const copy = arr.buffer.slice(0);
		const view = new Float32Array(copy);
		expect(view[0]).toBeCloseTo(1.0, 5);
		expect(view[1]).toBeCloseTo(2.0, 5);
		expect(view[2]).toBeCloseTo(3.0, 5);
	});
});
