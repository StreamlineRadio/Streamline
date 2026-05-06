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
		const za = deckStates.get(a)?.zIndex ?? 0;
		const zb = deckStates.get(b)?.zIndex ?? 0;
		return za - zb;
	})[0];
}
