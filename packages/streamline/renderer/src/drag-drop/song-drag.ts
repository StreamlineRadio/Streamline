import type { Song } from '@streamline/shared';

export const SONG_DRAG_TYPE = 'application/x-streamline-song';

export function setSongDragData(event: DragEvent, song: Song): void {
	event.dataTransfer?.setData(SONG_DRAG_TYPE, JSON.stringify(song));
	if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

export function getSongDragData(event: DragEvent): Song | null {
	const raw = event.dataTransfer?.getData(SONG_DRAG_TYPE);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as Song;
	} catch {
		return null;
	}
}

export function hasSongDragData(event: DragEvent): boolean {
	return event.dataTransfer?.types.includes(SONG_DRAG_TYPE) ?? false;
}
