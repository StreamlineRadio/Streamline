import { getAudioContext } from './context';
import { eventBus } from '../modules/event-bus';

export type DecodeTrack = (path: string) => Promise<AudioBuffer>;

export const TRACK_PRELOAD_STATE = 'track:preload:state';

export interface PreloadStatePayload {
	path: string;
	status: 'preloading' | 'ready' | 'cleared';
}

// A decoded f32 stereo 48 kHz track is large (~92 MB per 4 minutes), so a few
// preloaded tracks can add up fast. We do not hard-cap the cache; instead we warn
// once when the total decoded footprint crosses this threshold.
const RAM_WARNING_THRESHOLD_BYTES = 1024 ** 3;

const decodedByteLength = (buffer: AudioBuffer): number =>
	buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;

/* v8 ignore start -- @preserve: IPC + Web Audio decodeAudioData not available in jsdom */
const defaultDecode: DecodeTrack = async (path) => {
	const arrayBuffer = await window.streamline.api.library.readAudioFile(path);
	return getAudioContext().decodeAudioData(arrayBuffer);
};
/* v8 ignore stop */

export interface TrackPreloader {
	// Register the set of paths an owner (a queue instance) wants kept warm. The
	// cache holds the union of every owner's window plus manual preloads, so one
	// queue can never evict another's tracks.
	setWindow(ownerId: string, paths: string[]): void;
	// Decode a single track on demand, independent of any window. Stays cached
	// until taken or cleared.
	preloadManual(path: string): void;
	// Hand the decoded buffer to a deck and drop it from the cache. Null if the
	// track is not ready.
	take(path: string): AudioBuffer | null;
	// Drop an owner's window (queue destroyed); reconciles eviction.
	releaseOwner(ownerId: string): void;
	getStatus(path: string): 'preloading' | 'ready' | null;
	clear(): void;
}

interface CacheEntry {
	status: 'preloading' | 'ready';
	buffer: AudioBuffer | null;
	bytes: number;
}

export function createTrackPreloader(decode: DecodeTrack = defaultDecode): TrackPreloader {
	const entries = new Map<string, CacheEntry>();
	const windows = new Map<string, Set<string>>();
	const manual = new Set<string>();
	const inFlightGeneration = new Map<string, number>();
	let decodeSequence = 0;
	let ramWarned = false;

	const emit = (path: string, status: PreloadStatePayload['status']) =>
		eventBus.emit(TRACK_PRELOAD_STATE, { path, status } satisfies PreloadStatePayload);

	const checkRam = () => {
		let totalBytes = 0;
		for (const entry of entries.values()) totalBytes += entry.bytes;
		if (totalBytes > RAM_WARNING_THRESHOLD_BYTES && !ramWarned) {
			ramWarned = true;
			const megabytes = Math.round(totalBytes / 1024 ** 2);
			eventBus.emit('toast:show', {
				message: `Track preload cache is using over 1 GB of memory (${megabytes} MB). Lower the "preload first N tracks" setting on your queues to reduce memory use.`,
				type: 'warning'
			});
		} else if (totalBytes <= RAM_WARNING_THRESHOLD_BYTES) {
			ramWarned = false;
		}
	};

	const startDecode = (path: string) => {
		if (entries.has(path)) return;
		const generation = ++decodeSequence;
		inFlightGeneration.set(path, generation);
		entries.set(path, { status: 'preloading', buffer: null, bytes: 0 });
		emit(path, 'preloading');
		decode(path)
			.then((buffer) => {
				if (inFlightGeneration.get(path) !== generation) return;
				inFlightGeneration.delete(path);
				entries.set(path, { status: 'ready', buffer, bytes: decodedByteLength(buffer) });
				emit(path, 'ready');
				checkRam();
			})
			.catch(() => {
				if (inFlightGeneration.get(path) !== generation) return;
				inFlightGeneration.delete(path);
				entries.delete(path);
				emit(path, 'cleared');
			});
	};

	const evict = (path: string) => {
		entries.delete(path);
		inFlightGeneration.delete(path);
		emit(path, 'cleared');
	};

	const reconcile = () => {
		const desired = new Set<string>(manual);
		for (const paths of windows.values()) for (const path of paths) desired.add(path);

		for (const path of desired) startDecode(path);
		for (const path of [...entries.keys()]) if (!desired.has(path)) evict(path);
		checkRam();
	};

	return {
		setWindow(ownerId: string, paths: string[]): void {
			windows.set(ownerId, new Set(paths));
			reconcile();
		},
		preloadManual(path: string): void {
			manual.add(path);
			startDecode(path);
		},
		take(path: string): AudioBuffer | null {
			const entry = entries.get(path);
			if (!entry || entry.status !== 'ready') return null;
			entries.delete(path);
			manual.delete(path);
			emit(path, 'cleared');
			checkRam();
			return entry.buffer;
		},
		releaseOwner(ownerId: string): void {
			windows.delete(ownerId);
			reconcile();
		},
		getStatus(path: string): 'preloading' | 'ready' | null {
			return entries.get(path)?.status ?? null;
		},
		clear(): void {
			entries.clear();
			windows.clear();
			manual.clear();
			inFlightGeneration.clear();
			ramWarned = false;
		}
	};
}

export const trackPreloader = createTrackPreloader();
