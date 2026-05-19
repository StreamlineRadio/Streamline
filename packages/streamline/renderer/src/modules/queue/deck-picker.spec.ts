import { describe, it, expect } from 'vitest';
import { pickLeastRecentlyPushedDeck } from './deck-picker';

describe('pickLeastRecentlyPushedDeck', () => {
	it('returns null when linkedDeckIds is empty', () => {
		expect(pickLeastRecentlyPushedDeck([], new Map())).toBeNull();
	});

	it('returns the deck with the smallest lastPushedAt', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 200],
			['b', 100],
			['c', 300]
		]);
		expect(pickLeastRecentlyPushedDeck(['a', 'b', 'c'], lastPushedAt)).toBe('b');
	});

	it('treats a never-pushed deck (missing entry) as winning over any pushed deck', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 50],
			['c', 70]
		]);
		expect(pickLeastRecentlyPushedDeck(['a', 'b', 'c'], lastPushedAt)).toBe('b');
	});

	it('breaks ties by linkedDeckIds array order', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 100],
			['b', 100]
		]);
		expect(pickLeastRecentlyPushedDeck(['b', 'a'], lastPushedAt)).toBe('b');
	});

	it('ignores deck ids in lastPushedAt that are not in linkedDeckIds', () => {
		const lastPushedAt = new Map<string, number>([
			['x', 1],
			['a', 100]
		]);
		expect(pickLeastRecentlyPushedDeck(['a'], lastPushedAt)).toBe('a');
	});
});
