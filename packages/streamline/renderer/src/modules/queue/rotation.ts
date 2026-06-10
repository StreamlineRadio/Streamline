export interface DeckSnapshot {
	isPlaying: boolean;
	zIndex: number;
	sourcedFromQueue: boolean;
}

export function selectNextDeck(
	boundDeckIds: string[],
	deckStates: Map<string, DeckSnapshot>
): string | null {
	const candidates = boundDeckIds.filter((id) => {
		const snap = deckStates.get(id);
		return snap && !snap.sourcedFromQueue;
	});
	if (candidates.length === 0) return null;
	return candidates.toSorted((a, b) => {
		/* v8 ignore start -- @preserve: ?? 0 defaults unreachable; zIndex is always defined when present */
		const za = deckStates.get(a)?.zIndex ?? 0;
		const zb = deckStates.get(b)?.zIndex ?? 0;
		/* v8 ignore stop -- @preserve */
		return za - zb;
	})[0];
}
