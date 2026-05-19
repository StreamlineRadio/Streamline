import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/svelte';
import Deck from './Deck.svelte';
import { eventBus } from '../event-bus';
import type { DeckStatePayload } from './types';

interface MockDeckAudioInstance {
	triggerEnded: () => void;
}

vi.mock('./deck-audio', () => {
	const fakeAnalyser = {
		fftSize: 2048,
		smoothingTimeConstant: 0,
		getFloatTimeDomainData: vi.fn(),
		getFloatFrequencyData: vi.fn()
	};
	return {
		createDeckAudio: () => {
			let endedCallback: (() => void) | null = null;
			const instance = {
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
				onEnded: (cb: () => void) => {
					endedCallback = cb;
				},
				triggerEnded: () => endedCallback?.(),
				analyserNode: fakeAnalyser
			};
			(globalThis as unknown as { __deckAudio?: MockDeckAudioInstance }).__deckAudio = instance;
			return instance;
		}
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

	it('emits state(unloaded) before ended on natural end', async () => {
		const order: string[] = [];
		eventBus.on('deck:d2:state', (payload) => {
			order.push(`state:${(payload as DeckStatePayload).state}`);
		});
		eventBus.on('deck:d2:ended', () => {
			order.push('ended');
		});

		render(Deck, { instanceId: 'd2' });
		eventBus.emit('deck:d2:load-song', '/tmp/song.mp3');
		await waitFor(() => expect(order.some((e) => e === 'state:loaded')).toBe(true));

		const handle = (globalThis as unknown as { __deckAudio?: MockDeckAudioInstance }).__deckAudio;
		handle?.triggerEnded();

		const unloadedIdx = order.findIndex((e) => e === 'state:unloaded');
		const endedIdx = order.findIndex((e) => e === 'ended');
		expect(unloadedIdx).toBeGreaterThan(-1);
		expect(endedIdx).toBeGreaterThan(-1);
		expect(unloadedIdx).toBeLessThan(endedIdx);
	});

	it('emits state(unloaded) and load-failed when audio.load rejects', async () => {
		const events: string[] = [];
		const failedEvents: unknown[] = [];
		eventBus.on('deck:d3:state', (payload) => {
			events.push((payload as DeckStatePayload).state);
		});
		eventBus.on('deck:d3:load-failed', (payload) => {
			failedEvents.push(payload);
		});
		(window as unknown as { streamline: unknown }).streamline = {
			api: {
				library: {
					readAudioFile: vi.fn().mockRejectedValue(new Error('boom')),
					getCoverArt: vi.fn(),
					getSongByPath: vi.fn(),
					getFileMetadata: vi.fn(),
					loadWaveform: vi.fn(),
					saveWaveform: vi.fn()
				}
			},
			getPathForFile: vi.fn()
		};

		render(Deck, { instanceId: 'd3' });
		eventBus.emit('deck:d3:load-song', '/tmp/bad.mp3');
		await waitFor(() => expect(failedEvents.length).toBe(1));

		expect(events).toContain('loading');
		expect(events).toContain('unloaded');
	});

	it('re-emits current state on state-request', () => {
		const events: string[] = [];
		eventBus.on('deck:d4:state', (payload) => {
			events.push((payload as DeckStatePayload).state);
		});
		render(Deck, { instanceId: 'd4' });
		eventBus.emit('deck:d4:state-request', undefined);
		expect(events).toContain('unloaded');
	});

	it('opens settings modal via gear button and toggles sendMetadata', async () => {
		const { container } = render(Deck, { instanceId: 'd5' });
		const gearButton = container.querySelector('[title="Settings"]') as HTMLButtonElement;
		await fireEvent.click(gearButton);
		const checkbox = await waitFor(() => {
			const el = document.querySelector('[role="dialog"] input[type="checkbox"]');
			if (!el) throw new Error('modal not open');
			return el as HTMLInputElement;
		});
		expect(checkbox.checked).toBe(true);
		await fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(false);
	});
});
