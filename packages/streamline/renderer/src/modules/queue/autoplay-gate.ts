import type { DeckState } from '../deck/types';

export type AutoplayOutcome =
	| { kind: 'silent' }
	| { kind: 'no-other-deck' }
	| { kind: 'all-busy' }
	| { kind: 'ok'; candidates: string[] };

export interface AutoplayDecisionInput {
	autoplay: boolean;
	itemsCount: number;
	linkedDeckIds: readonly string[];
	endedDeckId: string;
	state: ReadonlyMap<string, DeckState>;
}

export function autoplayDecision(input: AutoplayDecisionInput): AutoplayOutcome {
	if (!input.autoplay) return { kind: 'silent' };
	if (input.itemsCount === 0) return { kind: 'silent' };
	if (input.linkedDeckIds.length === 0) return { kind: 'silent' };

	// Autoplay must push to a deck other than the one that just ended; that requires
	// at least two linked decks. With only one linked, there is no valid recipient.
	if (input.linkedDeckIds.length < 2) return { kind: 'no-other-deck' };

	const others = input.linkedDeckIds.filter((id) => id !== input.endedDeckId);
	// A deck with no state entry is treated as not-unloaded (conservatively blocked),
	// not as a candidate — matches the contract enforced by the spec.
	const candidates = others.filter((id) => input.state.get(id) === 'unloaded');
	if (candidates.length === 0) return { kind: 'all-busy' };

	return { kind: 'ok', candidates };
}
