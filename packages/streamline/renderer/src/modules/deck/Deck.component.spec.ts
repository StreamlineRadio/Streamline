import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import Deck from './Deck.svelte';
import { eventBus } from '../event-bus';
import type { DeckStatePayload } from './types';

vi.mock('./deck-audio', () => {
	const fakeAnalyser = {
		fftSize: 2048,
		smoothingTimeConstant: 0,
		getFloatTimeDomainData: vi.fn(),
		getFloatFrequencyData: vi.fn()
	};
	return {
		createDeckAudio: () => ({
			load: vi.fn().mockResolvedValue(undefined),
			play: vi.fn(),
			pause: vi.fn(),
			stop: vi.fn(),
			seek: vi.fn(),
			setVolume: vi.fn(),
			fadeOut: vi.fn(),
			destroy: vi.fn(),
			getDuration: () => 100,
			getPosition: () => 0,
			getPeaks: () => [],
			onEnded: vi.fn(),
			analyserNode: fakeAnalyser
		})
	};
});

vi.mock('../instance-store.svelte', () => ({
	instanceStore: {
		get: () => ({ record: { settingsJson: '{}' } }),
		update: vi.fn(),
		add: vi.fn(),
		remove: vi.fn(),
		all: new Map()
	}
}));

vi.mock('../../layout/store.svelte', () => ({
	layoutStore: {
		active: null,
		set: vi.fn(),
		updateInstance: vi.fn()
	}
}));

vi.mock('../../assets/favicon.svg?url', () => ({ default: 'favicon.svg' }));

describe('Deck (component) — state emits', () => {
	let stateEvents: DeckStatePayload[] = [];

	beforeEach(() => {
		stateEvents = [];
		eventBus.on('deck:d1:state', (payload) => {
			stateEvents.push(payload as DeckStatePayload);
		});
		(window as unknown as { streamline: unknown }).streamline = {
			api: {
				library: {
					readAudioFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
					getCoverArt: vi.fn().mockResolvedValue(null),
					getSongByPath: vi.fn().mockResolvedValue(null),
					getFileMetadata: vi.fn().mockResolvedValue(null),
					loadWaveform: vi.fn().mockResolvedValue(null),
					saveWaveform: vi.fn()
				}
			},
			getPathForFile: vi.fn()
		};
	});

	it('emits state(loading) then state(loaded) when a song is loaded', async () => {
		render(Deck, { instanceId: 'd1' });
		eventBus.emit('deck:d1:load-song', '/tmp/song.mp3');
		await waitFor(() => expect(stateEvents.length).toBeGreaterThanOrEqual(2));
		expect(stateEvents.map((e) => e.state)).toEqual(['loading', 'loaded']);
	});
});
