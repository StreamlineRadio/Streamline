import { getAudioContext } from './context';
import { eventBus } from '../modules/event-bus';

export type DecodeTrack = (path: string) => Promise<AudioBuffer>;

export const TRACK_PRELOAD_STATE = 'track:preload:state';

export interface PreloadStatePayload {
	// null only with status 'cleared', meaning every preload state was dropped.
	path: string | null;
	status: 'preloading' | 'ready' | 'cleared';
}

/* v8 ignore start -- @preserve: IPC + Web Audio decodeAudioData not available in jsdom */
const defaultDecode: DecodeTrack = async (path) => {
	const arrayBuffer = await window.streamline.api.library.readAudioFile(path);
	return getAudioContext().decodeAudioData(arrayBuffer);
};
/* v8 ignore stop */

export interface TrackPreloader {
	preload(path: string): void;
	take(path: string): AudioBuffer | null;
	clear(): void;
}

// Decodes the upcoming queue track ahead of time so an autoplay hand-off starts
// instantly instead of reading the file over IPC and running decodeAudioData on
// demand. Holds a single decoded buffer; the previous one is kept takeable until
// the next decode resolves, so the deck can still claim the just-advanced track
// even after the queue head has moved on.
export function createTrackPreloader(decode: DecodeTrack = defaultDecode): TrackPreloader {
	let cachedPath: string | null = null;
	let cachedBuffer: AudioBuffer | null = null;
	let inFlightPath: string | null = null;

	const emitState = (path: string | null, status: PreloadStatePayload['status']) =>
		eventBus.emit(TRACK_PRELOAD_STATE, { path, status } satisfies PreloadStatePayload);

	return {
		preload(path: string): void {
			if (path === cachedPath || path === inFlightPath) return;
			inFlightPath = path;
			emitState(path, 'preloading');
			decode(path)
				.then((buffer) => {
					if (inFlightPath !== path) return;
					cachedPath = path;
					cachedBuffer = buffer;
					inFlightPath = null;
					emitState(path, 'ready');
				})
				.catch(() => {
					if (inFlightPath !== path) return;
					inFlightPath = null;
					emitState(path, 'cleared');
				});
		},
		take(path: string): AudioBuffer | null {
			if (path !== cachedPath) return null;
			const buffer = cachedBuffer;
			cachedPath = null;
			cachedBuffer = null;
			emitState(path, 'cleared');
			return buffer;
		},
		clear(): void {
			cachedPath = null;
			cachedBuffer = null;
			inFlightPath = null;
			emitState(null, 'cleared');
		}
	};
}

export const trackPreloader = createTrackPreloader();
