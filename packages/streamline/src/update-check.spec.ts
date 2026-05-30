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
