import { describe, it, expect } from 'vitest';
import { selectNextDeck } from './rotation';
import type { DeckSnapshot } from './rotation';

const snap = (zIndex: number, isPlaying = false, sourcedFromQueue = false): DeckSnapshot => ({
	isPlaying,
	zIndex,
	sourcedFromQueue
});

describe('queue rotation', () => {
	it('returns null when all decks are sourced from queue', () => {
		const states = new Map([
			['d1', snap(1, true, true)],
			['d2', snap(2, true, true)]
		]);
		expect(selectNextDeck(['d1', 'd2'], states)).toBeNull();
	});

	it('picks the lowest z-index non-queue deck', () => {
		const states = new Map([
			['d1', snap(5, true, true)],
			['d2', snap(2, false, false)],
			['d3', snap(3, false, false)]
		]);
		expect(selectNextDeck(['d1', 'd2', 'd3'], states)).toBe('d2');
	});

	it('returns null when no decks are bound', () => {
		expect(selectNextDeck([], new Map())).toBeNull();
	});

	it('returns the only available deck', () => {
		const states = new Map([['d1', snap(1, false, false)]]);
		expect(selectNextDeck(['d1'], states)).toBe('d1');
	});
});
