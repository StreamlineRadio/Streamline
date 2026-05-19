import { describe, it, expect } from 'vitest';
import { shouldAutoplay } from './autoplay-gate';
import type { DeckState } from '../deck/types';

const allUnloaded = (ids: string[]) =>
	new Map<string, DeckState>(ids.map((id) => [id, 'unloaded' as DeckState]));

describe('shouldAutoplay', () => {
	it('returns false when autoplay is disabled', () => {
		expect(
			shouldAutoplay({
				autoplay: false,
				itemsCount: 1,
				linkedDeckIds: ['a'],
				state: allUnloaded(['a'])
			})
		).toBe(false);
	});

	it('returns false when itemsCount is 0', () => {
		expect(
			shouldAutoplay({
				autoplay: true,
				itemsCount: 0,
				linkedDeckIds: ['a'],
				state: allUnloaded(['a'])
			})
		).toBe(false);
	});

	it('returns false when linkedDeckIds is empty', () => {
		expect(
			shouldAutoplay({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: [],
				state: new Map()
			})
		).toBe(false);
	});

	it('returns false when any linked deck is loaded', () => {
		const state = new Map<string, DeckState>([
			['a', 'unloaded'],
			['b', 'loaded']
		]);
		expect(
			shouldAutoplay({ autoplay: true, itemsCount: 1, linkedDeckIds: ['a', 'b'], state })
		).toBe(false);
	});

	it('returns false when any linked deck is loading', () => {
		const state = new Map<string, DeckState>([
			['a', 'unloaded'],
			['b', 'loading']
		]);
		expect(
			shouldAutoplay({ autoplay: true, itemsCount: 1, linkedDeckIds: ['a', 'b'], state })
		).toBe(false);
	});

	it('returns false when any linked deck has no state entry (conservative default)', () => {
		const state = new Map<string, DeckState>([['a', 'unloaded']]);
		expect(
			shouldAutoplay({ autoplay: true, itemsCount: 1, linkedDeckIds: ['a', 'b'], state })
		).toBe(false);
	});

	it('returns true when autoplay on, items > 0, all linked decks unloaded', () => {
		expect(
			shouldAutoplay({
				autoplay: true,
				itemsCount: 3,
				linkedDeckIds: ['a', 'b'],
				state: allUnloaded(['a', 'b'])
			})
		).toBe(true);
	});
});
