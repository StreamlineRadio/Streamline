import { describe, it, expect } from 'vitest';
import { pickLeastRecentlyPushedDeck, pickLeastRecentlyPushedUnloadedDeck } from './deck-picker';
import type { DeckLifecycle } from '../deck/types';

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

	it('returns the least-recently-pushed deck whose lifecycle is unloaded', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 100],
			['b', 50],
			['c', 200]
		]);
		const lifecycle = new Map<string, DeckLifecycle>([
			['a', 'unloaded'],
			['b', 'loaded'],
			['c', 'unloaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['a', 'b', 'c'], lastPushedAt, lifecycle)).toBe('a');
	});

	it('falls through to the next-oldest when the first choice is non-unloaded', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 50],
			['b', 100]
		]);
		const lifecycle = new Map<string, DeckLifecycle>([
			['a', 'loading'],
			['b', 'unloaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['a', 'b'], lastPushedAt, lifecycle)).toBe('b');
	});

	it('treats missing lifecycle entries as non-unloaded (blocking)', () => {
		const lastPushedAt = new Map<string, number>([['a', 100]]);
		const lifecycle = new Map<string, DeckLifecycle>([['a', 'unloaded']]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['b', 'a'], lastPushedAt, lifecycle)).toBe('a');
	});

	it('returns null when no candidate is unloaded', () => {
		const lifecycle = new Map<string, DeckLifecycle>([
			['a', 'loading'],
			['b', 'loaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['a', 'b'], new Map(), lifecycle)).toBeNull();
	});

	it('breaks ties by linkedDeckIds array order among unloaded candidates', () => {
		const lastPushedAt = new Map<string, number>([
			['a', 100],
			['b', 100]
		]);
		const lifecycle = new Map<string, DeckLifecycle>([
			['a', 'unloaded'],
			['b', 'unloaded']
		]);
		expect(pickLeastRecentlyPushedUnloadedDeck(['b', 'a'], lastPushedAt, lifecycle)).toBe('b');
	});
});
