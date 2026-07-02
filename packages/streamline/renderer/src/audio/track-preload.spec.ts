import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./context', () => ({ getAudioContext: vi.fn() }));

import { createTrackPreloader, TRACK_PRELOAD_STATE, type DecodeTrack } from './track-preload';
import { eventBus, _clearEventBusForTesting } from '../modules/event-bus';

const fakeBuffer = (id: string, length = 1, channels = 2): AudioBuffer =>
	({ id, length, numberOfChannels: channels }) as unknown as AudioBuffer;

// length * channels * 4 bytes must exceed 1 GB to trip the RAM warning.
const oversizedBuffer = (id: string): AudioBuffer => fakeBuffer(id, 300_000_000, 1);

interface Deferred {
	resolve: (buffer: AudioBuffer) => void;
	reject: (reason: unknown) => void;
}

function deferredDecode() {
	const latest = new Map<string, Deferred>();
	const invocations: string[] = [];
	const decode: DecodeTrack = (path) => {
		invocations.push(path);
		return new Promise<AudioBuffer>((resolve, reject) => {
			latest.set(path, { resolve, reject });
		});
	};
	return { decode, latest, invocations };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('track-preload', () => {
	beforeEach(() => _clearEventBusForTesting());

	it('decodes a window and hands a ready track to a deck via take', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		expect(preloader.getStatus('/a.mp3')).toBe('preloading');
		expect(preloader.take('/a.mp3')).toBeNull();

		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		expect(preloader.getStatus('/a.mp3')).toBe('ready');
		const buffer = preloader.take('/a.mp3');
		expect(buffer).toEqual(fakeBuffer('a'));
		// take drops it from the cache.
		expect(preloader.getStatus('/a.mp3')).toBeNull();
		expect(preloader.take('/a.mp3')).toBeNull();
	});

	it('decodes the first N tracks of a window', () => {
		const { decode, invocations } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3', '/b.mp3', '/c.mp3']);
		expect(invocations).toEqual(['/a.mp3', '/b.mp3', '/c.mp3']);
	});

	it('does not re-decode a path already cached or in flight', async () => {
		const { decode, latest, invocations } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		preloader.setWindow('queue-1', ['/a.mp3']);
		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();
		preloader.setWindow('queue-1', ['/a.mp3']);

		expect(invocations).toEqual(['/a.mp3']);
	});

	it('evicts tracks that drop out of a window', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3', '/b.mp3']);
		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		latest.get('/b.mp3')!.resolve(fakeBuffer('b'));
		await flush();

		preloader.setWindow('queue-1', ['/a.mp3']);
		expect(preloader.getStatus('/a.mp3')).toBe('ready');
		expect(preloader.getStatus('/b.mp3')).toBeNull();
		expect(preloader.take('/b.mp3')).toBeNull();
	});

	it('keeps one queue from evicting another queue cache', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		preloader.setWindow('queue-2', ['/b.mp3']);
		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		latest.get('/b.mp3')!.resolve(fakeBuffer('b'));
		await flush();

		// queue-1 moves on; queue-2's cached track must survive.
		preloader.setWindow('queue-1', ['/x.mp3']);
		expect(preloader.getStatus('/a.mp3')).toBeNull();
		expect(preloader.getStatus('/b.mp3')).toBe('ready');
		expect(preloader.getStatus('/x.mp3')).toBe('preloading');
	});

	it('releaseOwner drops a window and evicts its tracks', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		preloader.releaseOwner('queue-1');
		expect(preloader.getStatus('/a.mp3')).toBeNull();
	});

	it('manual preload caches a track independent of any window', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preloadManual('/m.mp3');
		expect(preloader.getStatus('/m.mp3')).toBe('preloading');
		latest.get('/m.mp3')!.resolve(fakeBuffer('m'));
		await flush();

		// A window reconcile that does not include it must not evict it.
		preloader.setWindow('queue-1', ['/a.mp3']);
		expect(preloader.getStatus('/m.mp3')).toBe('ready');

		// take clears the manual pin so it is not re-decoded.
		expect(preloader.take('/m.mp3')).toEqual(fakeBuffer('m'));
		preloader.setWindow('queue-1', ['/a.mp3']);
		expect(preloader.getStatus('/m.mp3')).toBeNull();
	});

	it('discards a superseded decode that resolves after eviction', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		preloader.setWindow('queue-1', []); // evicts the in-flight /a.mp3

		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();
		expect(preloader.getStatus('/a.mp3')).toBeNull();
		expect(preloader.take('/a.mp3')).toBeNull();
	});

	it('clears the entry when a decode rejects, and allows a retry', async () => {
		const { decode, latest, invocations } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		latest.get('/a.mp3')!.reject(new Error('read failed'));
		await flush();
		expect(preloader.getStatus('/a.mp3')).toBeNull();

		preloader.preloadManual('/a.mp3');
		expect(invocations).toEqual(['/a.mp3', '/a.mp3']);
	});

	it('ignores a superseded decode that rejects after eviction', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		preloader.setWindow('queue-1', []);
		latest.get('/a.mp3')!.reject(new Error('stale'));
		await flush();

		preloader.setWindow('queue-1', ['/b.mp3']);
		latest.get('/b.mp3')!.resolve(fakeBuffer('b'));
		await flush();
		expect(preloader.getStatus('/b.mp3')).toBe('ready');
	});

	it('clear drops everything', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.setWindow('queue-1', ['/a.mp3']);
		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		preloader.clear();
		expect(preloader.getStatus('/a.mp3')).toBeNull();
		expect(preloader.take('/a.mp3')).toBeNull();
	});

	it('emits preloading, then ready, then cleared on take', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);
		const events: unknown[] = [];
		eventBus.on(TRACK_PRELOAD_STATE, (payload) => events.push(payload));

		preloader.setWindow('queue-1', ['/a.mp3']);
		latest.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();
		preloader.take('/a.mp3');

		expect(events).toEqual([
			{ path: '/a.mp3', status: 'preloading' },
			{ path: '/a.mp3', status: 'ready' },
			{ path: '/a.mp3', status: 'cleared' }
		]);
	});

	it('warns once when the cache exceeds 1 GB, then resets after it drops', async () => {
		const { decode, latest } = deferredDecode();
		const preloader = createTrackPreloader(decode);
		const warnings: unknown[] = [];
		eventBus.on('toast:show', (payload) => warnings.push(payload));

		preloader.setWindow('queue-1', ['/big.mp3']);
		latest.get('/big.mp3')!.resolve(oversizedBuffer('big'));
		await flush();
		expect(warnings).toHaveLength(1);
		expect((warnings[0] as { type: string }).type).toBe('warning');

		// Still over the threshold: reconciling again must not warn twice.
		preloader.setWindow('queue-1', ['/big.mp3']);
		expect(warnings).toHaveLength(1);

		// Drop below the threshold and re-cross it: warns again.
		preloader.take('/big.mp3');
		preloader.preloadManual('/big2.mp3');
		latest.get('/big2.mp3')!.resolve(oversizedBuffer('big2'));
		await flush();
		expect(warnings).toHaveLength(2);
	});
});
