import { describe, it, expect } from 'vitest';
import { resolveUpdate, type ReleaseInfo } from './update-check';

const stableRelease = (tag: string): ReleaseInfo => ({
	tag_name: tag,
	name: tag,
	html_url: `https://github.com/StreamlineRadio/Streamline/releases/tag/${tag}`
});

describe('resolveUpdate — stable', () => {
	it('notifies when the remote stable release is newer', () => {
		const notice = resolveUpdate({
			channel: 'stable',
			currentVersion: '0.0.1',
			release: stableRelease('v0.0.2')
		});
		expect(notice).toEqual({
			version: '0.0.2',
			url: 'https://github.com/StreamlineRadio/Streamline/releases/latest'
		});
	});

	it('returns null when versions are equal', () => {
		expect(
			resolveUpdate({
				channel: 'stable',
				currentVersion: '0.0.2',
				release: stableRelease('v0.0.2')
			})
		).toBeNull();
	});

	it('returns null when the remote is older', () => {
		expect(
			resolveUpdate({
				channel: 'stable',
				currentVersion: '0.0.3',
				release: stableRelease('v0.0.2')
			})
		).toBeNull();
	});

	it('returns null when there is no release', () => {
		expect(resolveUpdate({ channel: 'stable', currentVersion: '0.0.1', release: null })).toBeNull();
	});
});

const nightlyRelease = (sha: string): ReleaseInfo => ({
	tag_name: 'nightly',
	name: `0.0.1-nightly.${sha}`,
	html_url: 'https://github.com/StreamlineRadio/Streamline/releases/tag/nightly'
});

describe('resolveUpdate — nightly', () => {
	it('notifies when the remote nightly sha differs', () => {
		const notice = resolveUpdate({
			channel: 'nightly',
			currentVersion: '0.0.1-nightly.gaaaaaaa',
			release: nightlyRelease('gbbbbbbb')
		});
		expect(notice).toEqual({
			version: '0.0.1-nightly.gbbbbbbb',
			url: 'https://github.com/StreamlineRadio/Streamline/releases/tag/nightly'
		});
	});

	it('returns null when the nightly sha is identical', () => {
		expect(
			resolveUpdate({
				channel: 'nightly',
				currentVersion: '0.0.1-nightly.gaaaaaaa',
				release: nightlyRelease('gaaaaaaa')
			})
		).toBeNull();
	});

	it('returns null when the release name is unparseable', () => {
		expect(
			resolveUpdate({
				channel: 'nightly',
				currentVersion: '0.0.1-nightly.gaaaaaaa',
				release: { tag_name: 'nightly', name: 'garbage', html_url: 'x' }
			})
		).toBeNull();
	});

	it('returns null when the local version has no sha', () => {
		expect(
			resolveUpdate({
				channel: 'nightly',
				currentVersion: '0.0.1',
				release: nightlyRelease('gbbbbbbb')
			})
		).toBeNull();
	});

	it('returns null when there is no nightly release', () => {
		expect(
			resolveUpdate({ channel: 'nightly', currentVersion: '0.0.1-nightly.gaaaaaaa', release: null })
		).toBeNull();
	});
});
