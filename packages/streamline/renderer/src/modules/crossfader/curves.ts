export type CurveType = 'linear' | 'equal-power' | 'cut';

// position: -1 (full A) to +1 (full B), returns [gainA, gainB] each 0..1
export function applyCurve(position: number, curve: CurveType): [number, number] {
	const t = (Math.max(-1, Math.min(1, position)) + 1) / 2; // normalize to 0..1
	switch (curve) {
		case 'linear':
			return [1 - t, t];
		case 'equal-power':
			return [Math.cos((t * Math.PI) / 2), Math.sin((t * Math.PI) / 2)];
		case 'cut':
			return [t < 0.5 ? 1 : 0, t >= 0.5 ? 1 : 0];
	}
}
