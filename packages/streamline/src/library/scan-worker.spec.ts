import { describe, it, expect } from 'vitest';
import { songId } from './scan-worker';

describe('songId', () => {
	it('is deterministic', () => {
		expect(songId('/a/b.mp3', 1024, 1700000000)).toBe(songId('/a/b.mp3', 1024, 1700000000));
	});

	it('differs when mtime changes', () => {
		expect(songId('/a/b.mp3', 1024, 1700000000)).not.toBe(songId('/a/b.mp3', 1024, 1700000001));
	});

	it('is 32 hex chars', () => {
		expect(songId('/a', 1, 1)).toHaveLength(32);
	});
});
