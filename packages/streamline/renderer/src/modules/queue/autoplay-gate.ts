import type { DeckState } from '../deck/types';

export interface ShouldAutoplayInput {
	autoplay: boolean;
	itemsCount: number;
	linkedDeckIds: readonly string[];
	state: ReadonlyMap<string, DeckState>;
}

export function shouldAutoplay(input: ShouldAutoplayInput): boolean {
	if (!input.autoplay) return false;
	if (input.itemsCount === 0) return false;
	if (input.linkedDeckIds.length === 0) return false;
	for (const deckId of input.linkedDeckIds) {
		if (input.state.get(deckId) !== 'unloaded') return false;
	}
	return true;
}
