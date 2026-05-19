export function pickLeastRecentlyPushedDeck(
	linkedDeckIds: readonly string[],
	lastPushedAt: ReadonlyMap<string, number>
): string | null {
	if (linkedDeckIds.length === 0) return null;
	let chosen: string | null = null;
	let chosenStamp = Number.POSITIVE_INFINITY;
	for (const deckId of linkedDeckIds) {
		const stamp = lastPushedAt.get(deckId) ?? Number.NEGATIVE_INFINITY;
		if (stamp < chosenStamp) {
			chosen = deckId;
			chosenStamp = stamp;
		}
	}
	return chosen;
}
