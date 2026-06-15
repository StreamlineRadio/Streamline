import { getAudioContext } from './context';

export type DecodeTrack = (path: string) => Promise<AudioBuffer>;

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

	return {
		preload(path: string): void {
			if (path === cachedPath || path === inFlightPath) return;
			inFlightPath = path;
			decode(path)
				.then((buffer) => {
					if (inFlightPath !== path) return;
					cachedPath = path;
					cachedBuffer = buffer;
					inFlightPath = null;
				})
				.catch(() => {
					if (inFlightPath === path) inFlightPath = null;
				});
		},
		take(path: string): AudioBuffer | null {
			if (path !== cachedPath) return null;
			const buffer = cachedBuffer;
			cachedPath = null;
			cachedBuffer = null;
			return buffer;
		},
		clear(): void {
			cachedPath = null;
			cachedBuffer = null;
			inFlightPath = null;
		}
	};
}

export const trackPreloader = createTrackPreloader();
