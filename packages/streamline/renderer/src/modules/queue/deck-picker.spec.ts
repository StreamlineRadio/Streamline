import { describe, it, expect } from 'vitest';
import { pickLeastRecentlyPushedDeck, pickLeastRecentlyPushedUnloadedDeck } from './deck-picker';
import type { DeckState } from '../deck/types';

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

describe('pickLeastRecentlyPushedUnloadedDeck', () => {
	it('returns null when linkedDeckIds is empty', () => {
		expect(pickLeastRecentlyPushedUnloadedDeck([], new Map(), new Map())).toBeNull();
	});

	it('returns the least-recently-pushed deck whose state is unloaded', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 100],
			['b', 50],
			['c', 200]
		]);
		const state = new Map<string, DeckState>([
			['a', 'unloaded'],
			['b', 'loaded'],
			['c', 'unloaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['a', 'b', 'c'], lastPushedAt, state)).toBe('a');
	});

	it('falls through to the next-oldest when the first choice is non-unloaded', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 50],
			['b', 100]
		]);
		const state = new Map<string, DeckState>([
			['a', 'loading'],
			['b', 'unloaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['a', 'b'], lastPushedAt, state)).toBe('b');
	});

	it('treats missing state entries as non-unloaded (blocking)', () => {
		const lastPushedAt = new Map<string, number>([['a', 100]]);
		const state = new Map<string, DeckState>([['a', 'unloaded']]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['b', 'a'], lastPushedAt, state)).toBe('a');
	});

	it('returns null when no candidate is unloaded', () => {
		const state = new Map<string, DeckState>([
			['a', 'loading'],
			['b', 'loaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['a', 'b'], new Map(), state)).toBeNull();
	});

	it('breaks ties by linkedDeckIds array order among unloaded candidates', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 100],
			['b', 100]
		]);
		const state = new Map<string, DeckState>([
			['a', 'unloaded'],
			['b', 'unloaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['b', 'a'], lastPushedAt, state)).toBe('b');
	});
});
