import { describe, it, expect } from 'vitest';
import { applyCurve } from './curves';

describe('crossfader curves', () => {
	describe('linear', () => {
		it('full A at -1', () => expect(applyCurve(-1, 'linear')).toEqual([1, 0]));
		it('equal at 0', () => expect(applyCurve(0, 'linear')).toEqual([0.5, 0.5]));
		it('full B at +1', () => expect(applyCurve(1, 'linear')).toEqual([0, 1]));
	});

	describe('equal-power', () => {
		it('full A at -1', () => {
			const [a, b] = applyCurve(-1, 'equal-power');
			expect(a).toBeCloseTo(1, 3);
			expect(b).toBeCloseTo(0, 3);
		});
		it('full B at +1', () => {
			const [a, b] = applyCurve(1, 'equal-power');
			expect(a).toBeCloseTo(0, 3);
			expect(b).toBeCloseTo(1, 3);
		});
		it('satisfies power law: a² + b² ≈ 1 at midpoint', () => {
			const [a, b] = applyCurve(0, 'equal-power');
			expect(a * a + b * b).toBeCloseTo(1, 3);
		});
	});

	describe('cut', () => {
		it('A only for position < 0', () => expect(applyCurve(-0.5, 'cut')).toEqual([1, 0]));
		it('B only for position > 0', () => expect(applyCurve(0.5, 'cut')).toEqual([0, 1]));
		it('B at 0 (crossover point)', () => expect(applyCurve(0, 'cut')).toEqual([0, 1]));
	});
});
