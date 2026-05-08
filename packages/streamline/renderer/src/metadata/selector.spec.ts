import { describe, it, expect } from 'vitest';
import { selectMetadataWinner } from './selector';
import type { DeckMetaSnapshot } from './selector';

const deck = (id: string, opts: Partial<DeckMetaSnapshot> = {}): DeckMetaSnapshot => ({
	instanceId: id,
	isPlaying: true,
	sendMetadata: true,
	lastStartedAt: 1000,
	zIndex: 1,
	currentSong: null,
	...opts
});

describe('metadata selector', () => {
	it('returns null when no decks are playing', () => {
		expect(selectMetadataWinner([])).toBeNull();
	});

	it('returns null when no deck has sendMetadata enabled', () => {
		expect(selectMetadataWinner([deck('d1', { sendMetadata: false })])).toBeNull();
	});

	it('most recently started deck wins', () => {
		const decks = [deck('d1', { lastStartedAt: 1000 }), deck('d2', { lastStartedAt: 2000 })];
		expect(selectMetadataWinner(decks)?.instanceId).toBe('d2');
	});

	it('breaks ties by lowest z-index', () => {
		const decks = [
			deck('d1', { lastStartedAt: 5000, zIndex: 3 }),
			deck('d2', { lastStartedAt: 5000, zIndex: 1 })
		];
		expect(selectMetadataWinner(decks)?.instanceId).toBe('d2');
	});

	it('ignores decks with sendMetadata=false', () => {
		const decks = [
			deck('d1', { lastStartedAt: 3000, sendMetadata: false }),
			deck('d2', { lastStartedAt: 1000 })
		];
		expect(selectMetadataWinner(decks)?.instanceId).toBe('d2');
	});
});
