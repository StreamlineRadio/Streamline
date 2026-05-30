import { describe, it, expect } from 'vitest';
import { autoplayDecision } from './autoplay-gate';
import type { DeckState } from '../deck/types';

const allUnloaded = (ids: string[]) =>
	new Map<string, DeckState>(ids.map((id) => [id, 'unloaded' as DeckState]));

describe('autoplayDecision', () => {
	it('silent when autoplay is disabled', () => {
		expect(
			autoplayDecision({
				autoplay: false,
				itemsCount: 1,
				linkedDeckIds: ['a', 'b'],
				endedDeckId: 'a',
				state: allUnloaded(['a', 'b'])
			})
		).toEqual({ kind: 'silent' });
	});

	it('silent when itemsCount is 0', () => {
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 0,
				linkedDeckIds: ['a', 'b'],
				endedDeckId: 'a',
				state: allUnloaded(['a', 'b'])
			})
		).toEqual({ kind: 'silent' });
	});

	it('silent when no decks are linked', () => {
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: [],
				endedDeckId: 'a',
				state: new Map()
			})
		).toEqual({ kind: 'silent' });
	});

	it('no-other-deck when only the ended deck is linked', () => {
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['a'],
				endedDeckId: 'a',
				state: allUnloaded(['a'])
			})
		).toEqual({ kind: 'no-other-deck' });
	});

	it('no-other-deck when only one deck is linked, even if it is not the ended one', () => {
		// Edge: deck X (not in linkedDeckIds) emits :ended through some race. Treat the same:
		// there is still only one linked deck, so autoplay cannot push to "another" deck.
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['a'],
				endedDeckId: 'x',
				state: allUnloaded(['a'])
			})
		).toEqual({ kind: 'no-other-deck' });
	});

	it('all-busy when every other linked deck is loaded', () => {
		const state = new Map<string, DeckState>([
			['a', 'unloaded'],
			['b', 'loaded']
		]);
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['a', 'b'],
				endedDeckId: 'a',
				state
			})
		).toEqual({ kind: 'all-busy' });
	});

	it('all-busy when every other linked deck is loading', () => {
		const state = new Map<string, DeckState>([
			['a', 'unloaded'],
			['b', 'loading']
		]);
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['a', 'b'],
				endedDeckId: 'a',
				state
			})
		).toEqual({ kind: 'all-busy' });
	});

	it('all-busy when an other linked deck has no state entry (conservative default)', () => {
		const state = new Map<string, DeckState>([['a', 'unloaded']]);
		// b has no state entry → treated as not-unloaded → blocking
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['a', 'b'],
				endedDeckId: 'a',
				state
			})
		).toEqual({ kind: 'all-busy' });
	});

	it('ok with the unloaded other deck as the single candidate', () => {
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['a', 'b'],
				endedDeckId: 'a',
				state: allUnloaded(['a', 'b'])
			})
		).toEqual({ kind: 'ok', candidates: ['b'] });
	});

	it('ok with multiple unloaded candidates, excluding the ended deck', () => {
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['a', 'b', 'c'],
				endedDeckId: 'a',
				state: allUnloaded(['a', 'b', 'c'])
			})
		).toEqual({ kind: 'ok', candidates: ['b', 'c'] });
	});

	it('ok preserves linkedDeckIds order among candidates (for downstream tie-breaks)', () => {
		expect(
			autoplayDecision({
				autoplay: true,
				itemsCount: 1,
				linkedDeckIds: ['c', 'a', 'b'],
				endedDeckId: 'a',
				state: allUnloaded(['c', 'a', 'b'])
			})
		).toEqual({ kind: 'ok', candidates: ['c', 'b'] });
	});
});
