import type { Song } from '@streamline/shared';

export interface DeckMetaSnapshot {
	instanceId: string;
	isPlaying: boolean;
	sendMetadata: boolean;
	lastStartedAt: number;
	zIndex: number;
	currentSong: Song | null;
}

export function selectMetadataWinner(decks: DeckMetaSnapshot[]): DeckMetaSnapshot | null {
	const candidates = decks.filter((d) => d.sendMetadata && d.isPlaying);
	if (candidates.length === 0) return null;

	return candidates.sort((a, b) => {
		if (b.lastStartedAt !== a.lastStartedAt) return b.lastStartedAt - a.lastStartedAt;
		return a.zIndex - b.zIndex;
	})[0];
}
