import { describe, it, expect, vi } from 'vitest';
import { setSongDragData, getSongDragData, hasSongDragData, SONG_DRAG_TYPE } from './song-drag';
import type { Song } from '@streamline/shared';

function makeSong(): Song {
	return {
		id: 's1',
		path: '/music/s.mp3',
		title: 'Song',
		artist: null,
		album: null,
		durationSec: 60,
		sampleRate: null,
		channels: null,
		bitrateKbps: null,
		codec: null,
		artworkPath: null,
		waveformPath: null,
		fileSize: null,
		fileMtime: null,
		addedAt: 0,
		lastPlayedAt: null,
		playCount: 0,
		missing: false
	};
}

function makeDragEvent(data?: Record<string, string>, types?: string[]) {
	const store: Record<string, string> = data ?? {};
	return {
		dataTransfer: {
			setData: vi.fn((type: string, value: string) => {
				store[type] = value;
			}),
			getData: vi.fn((type: string) => store[type] ?? ''),
			types: types ?? Object.keys(store),
			effectAllowed: ''
		}
	} as unknown as DragEvent;
}

describe('song-drag', () => {
	it('setSongDragData serialises song and sets effectAllowed', () => {
		const song = makeSong();
		const event = makeDragEvent();
		setSongDragData(event, song);
		expect(event.dataTransfer!.setData).toHaveBeenCalledWith(SONG_DRAG_TYPE, JSON.stringify(song));
		expect(event.dataTransfer!.effectAllowed).toBe('move');
	});

	it('getSongDragData deserialises the song', () => {
		const song = makeSong();
		const event = makeDragEvent({ [SONG_DRAG_TYPE]: JSON.stringify(song) });
		expect(getSongDragData(event)).toEqual(song);
	});

	it('getSongDragData returns null when data is missing', () => {
		const event = makeDragEvent({});
		expect(getSongDragData(event)).toBeNull();
	});

	it('getSongDragData returns null on invalid JSON', () => {
		const event = makeDragEvent({ [SONG_DRAG_TYPE]: '{bad json' });
		expect(getSongDragData(event)).toBeNull();
	});

	it('hasSongDragData returns true when type is present', () => {
		const event = makeDragEvent({}, [SONG_DRAG_TYPE]);
		expect(hasSongDragData(event)).toBe(true);
	});

	it('hasSongDragData returns false when type is absent', () => {
		const event = makeDragEvent({}, ['text/plain']);
		expect(hasSongDragData(event)).toBe(false);
	});

	it('hasSongDragData returns false when dataTransfer is null', () => {
		expect(hasSongDragData({} as DragEvent)).toBe(false);
	});
});
