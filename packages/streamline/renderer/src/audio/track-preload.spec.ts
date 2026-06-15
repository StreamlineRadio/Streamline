import { describe, it, expect, vi } from 'vitest';

vi.mock('./context', () => ({ getAudioContext: vi.fn() }));

import { createTrackPreloader, type DecodeTrack } from './track-preload';

const fakeBuffer = (id: string): AudioBuffer => ({ id }) as unknown as AudioBuffer;

interface Deferred {
	promise: Promise<AudioBuffer>;
	resolve: (buffer: AudioBuffer) => void;
	reject: (reason: unknown) => void;
}

function deferredDecode() {
	const calls = new Map<string, Deferred>();
	const invocations: string[] = [];
	const decode: DecodeTrack = (path) => {
		invocations.push(path);
		let resolve!: (buffer: AudioBuffer) => void;
		let reject!: (reason: unknown) => void;
		const promise = new Promise<AudioBuffer>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		calls.set(path, { promise, resolve, reject });
		return promise;
	};
	return { decode, calls, invocations };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('track-preload', () => {
	it('decodes and caches a track, then hands it off via take', async () => {
		const { decode, calls } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		expect(preloader.take('/a.mp3')).toBeNull();

		calls.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		const buffer = preloader.take('/a.mp3');
		expect(buffer).toEqual(fakeBuffer('a'));
		// take removes it: a second take returns null.
		expect(preloader.take('/a.mp3')).toBeNull();
	});

	it('take returns null for a path that was never cached', async () => {
		const { decode, calls } = deferredDecode();
		const preloader = createTrackPreloader(decode);
		preloader.preload('/a.mp3');
		calls.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		expect(preloader.take('/other.mp3')).toBeNull();
	});

	it('ignores a duplicate preload of the cached path', async () => {
		const { decode, calls, invocations } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		calls.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		preloader.preload('/a.mp3');
		expect(invocations).toEqual(['/a.mp3']);
	});

	it('ignores a duplicate preload while decode is in flight', () => {
		const { decode, invocations } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		preloader.preload('/a.mp3');
		expect(invocations).toEqual(['/a.mp3']);
	});

	it('keeps the previous buffer takeable until the next decode resolves', async () => {
		const { decode, calls } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		calls.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		// Head advanced: preload the new track while the old one is still cached.
		preloader.preload('/b.mp3');
		expect(preloader.take('/a.mp3')).toEqual(fakeBuffer('a'));

		calls.get('/b.mp3')!.resolve(fakeBuffer('b'));
		await flush();
		expect(preloader.take('/b.mp3')).toEqual(fakeBuffer('b'));
	});

	it('discards a superseded decode that resolves late', async () => {
		const { decode, calls } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		preloader.preload('/b.mp3');

		calls.get('/b.mp3')!.resolve(fakeBuffer('b'));
		await flush();
		calls.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		expect(preloader.take('/a.mp3')).toBeNull();
		expect(preloader.take('/b.mp3')).toEqual(fakeBuffer('b'));
	});

	it('clears the in-flight marker when a decode rejects', async () => {
		const { decode, calls, invocations } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		calls.get('/a.mp3')!.reject(new Error('read failed'));
		await flush();

		expect(preloader.take('/a.mp3')).toBeNull();
		// In-flight marker cleared, so a retry of the same path decodes again.
		preloader.preload('/a.mp3');
		expect(invocations).toEqual(['/a.mp3', '/a.mp3']);
	});

	it('ignores a superseded decode that rejects late', async () => {
		const { decode, calls } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		preloader.preload('/b.mp3');

		calls.get('/a.mp3')!.reject(new Error('stale'));
		await flush();

		// /b.mp3 is still the in-flight decode and resolves normally.
		calls.get('/b.mp3')!.resolve(fakeBuffer('b'));
		await flush();
		expect(preloader.take('/b.mp3')).toEqual(fakeBuffer('b'));
	});

	it('clear drops the cached buffer and in-flight marker', async () => {
		const { decode, calls } = deferredDecode();
		const preloader = createTrackPreloader(decode);

		preloader.preload('/a.mp3');
		calls.get('/a.mp3')!.resolve(fakeBuffer('a'));
		await flush();

		preloader.clear();
		expect(preloader.take('/a.mp3')).toBeNull();

		// In-flight decode is also abandoned: a later resolve is ignored.
		preloader.preload('/b.mp3');
		preloader.clear();
		calls.get('/b.mp3')!.resolve(fakeBuffer('b'));
		await flush();
		expect(preloader.take('/b.mp3')).toBeNull();
	});
});
