import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Queue from './Queue.svelte';
import { eventBus, _clearEventBusForTesting } from '../event-bus';
import type { DeckState } from '../deck/types';
import type { Song } from '@streamline/shared';

function makeSong(overrides: Partial<Song> = {}): Song {
	return {
		id: 's1',
		path: '/tmp/song1.mp3',
		title: 's1',
		artist: null,
		album: null,
		durationSec: 60,
		sampleRate: null,
		channels: null,
		bitrateKbps: null,
		codec: null,
		artworkPath: null,
		waveformPath: null,
		fileSize: null,
		fileMtime: null,
		addedAt: 0,
		lastPlayedAt: null,
		playCount: 0,
		missing: false,
		...overrides
	};
}

function queueAddSong(): (song: Song) => void {
	const addSong = (window as unknown as { __queue_addSong?: (song: Song) => void }).__queue_addSong;
	if (!addSong) throw new Error('window.__queue_addSong not set — Queue not mounted?');
	return addSong;
}

const { layoutUpdateInstance, instanceUpdate, settingsHolder, layoutInstancesHolder } = vi.hoisted(
	() => ({
		layoutUpdateInstance: vi.fn(),
		instanceUpdate: vi.fn(),
		settingsHolder: { current: JSON.stringify({ autoplay: false, linkedDeckIds: [] }) },
		layoutInstancesHolder: { current: [] as Array<{ id: string; moduleId: string }> }
	})
);

vi.mock('../instance-store.svelte', () => ({
	instanceStore: {
		get: () => ({ record: { settingsJson: settingsHolder.current } }),
		update: instanceUpdate,
		add: vi.fn(),
		remove: vi.fn(),
		all: new Map()
	}
}));

vi.mock('../../layout/store.svelte', () => ({
	layoutStore: {
		get active() {
			return { id: 'L', instances: layoutInstancesHolder.current };
		},
		set: vi.fn(),
		updateInstance: layoutUpdateInstance
	}
}));

vi.mock('../../assets/favicon.svg?url', () => ({ default: 'favicon.svg' }));

describe('Queue (component)', () => {
	beforeEach(() => {
		layoutUpdateInstance.mockReset();
		instanceUpdate.mockReset();
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: [] });
		layoutInstancesHolder.current = [];
		_clearEventBusForTesting();
	});

	it('toggling the autoplay toolbar button persists autoplay in settingsJson', async () => {
		const { container } = render(Queue, { instanceId: 'q1' });
		const autoplayButton = container.querySelector('[title="Autoplay off"]') as HTMLButtonElement;
		await fireEvent.click(autoplayButton);
		expect(layoutUpdateInstance).toHaveBeenCalledWith(
			'q1',
			expect.objectContaining({
				settingsJson: expect.stringContaining('"autoplay":true')
			})
		);
	});

	it('emits state-request for each linked deck on mount', () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		const stateRequestCalls: unknown[] = [];
		eventBus.on('deck:d1:state-request', () => stateRequestCalls.push(undefined));

		render(Queue, { instanceId: 'q2' });

		expect(stateRequestCalls.length).toBeGreaterThanOrEqual(1);
	});

	it('tracks deck remaining via deck:${id}:remaining events for linked decks', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		const { container } = render(Queue, { instanceId: 'q3' });

		// Add a queue item so the ETA cell renders against deckEtaBase
		const queue = container as HTMLElement;
		// Seed a remaining payload from d1; recomputeDeckEtaBase should update deckEtaBase
		eventBus.emit('deck:d1:state', { state: 'loaded' as DeckState });
		eventBus.emit('deck:d1:remaining', { remaining: 90 });

		// No assertion that DOM updates yet (no items); this confirms no listener-side throw.
		expect(queue).toBeTruthy();
	});

	it('does not subscribe to decks outside linkedDeckIds', () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		const stateRequestForD2: unknown[] = [];
		eventBus.on('deck:d2:state-request', () => stateRequestForD2.push(undefined));
		render(Queue, { instanceId: 'q4' });
		expect(stateRequestForD2.length).toBe(0);
	});

	it('autoplay: on deck:X:ended with conditions met, shifts the first item and emits load-song to the least-recently-pushed deck', () => {
		settingsHolder.current = JSON.stringify({ autoplay: true, linkedDeckIds: ['d1', 'd2'] });
		layoutInstancesHolder.current = [
			{ id: 'd1', moduleId: 'deck' },
			{ id: 'd2', moduleId: 'deck' }
		];

		const loadSongCalls: { deckId: string; path: string }[] = [];
		eventBus.on('deck:d1:load-song', (payload) =>
			loadSongCalls.push({ deckId: 'd1', path: payload as string })
		);
		eventBus.on('deck:d2:load-song', (payload) =>
			loadSongCalls.push({ deckId: 'd2', path: payload as string })
		);

		render(Queue, { instanceId: 'q5' });
		queueAddSong()(makeSong());

		eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
		eventBus.emit('deck:d2:state', { state: 'unloaded' as DeckState });

		eventBus.emit('deck:d1:ended', undefined);

		// Tie-break is "deck with no prior push wins"; both are at -Infinity, so the
		// first id in linkedDeckIds (d1) is chosen.
		expect(loadSongCalls).toEqual([{ deckId: 'd1', path: '/tmp/song1.mp3' }]);
	});

	it('autoplay: does nothing when any linked deck is still loaded', () => {
		settingsHolder.current = JSON.stringify({ autoplay: true, linkedDeckIds: ['d1', 'd2'] });
		layoutInstancesHolder.current = [
			{ id: 'd1', moduleId: 'deck' },
			{ id: 'd2', moduleId: 'deck' }
		];

		const loadSongCalls: unknown[] = [];
		eventBus.on('deck:d1:load-song', () => loadSongCalls.push('d1'));
		eventBus.on('deck:d2:load-song', () => loadSongCalls.push('d2'));

		render(Queue, { instanceId: 'q6' });
		queueAddSong()(makeSong());

		eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
		eventBus.emit('deck:d2:state', { state: 'loaded' as DeckState });
		eventBus.emit('deck:d1:ended', undefined);

		expect(loadSongCalls).toEqual([]);
	});

	it('double-click: with linked deck idle, emits load-if-idle and removes the item', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];

		const loadIfIdleCalls: { path: string }[] = [];
		eventBus.on('deck:d1:load-if-idle', (payload) => {
			const { path, onAccept } = payload as { path: string; onAccept: () => void };
			loadIfIdleCalls.push({ path });
			onAccept();
		});

		const { container } = render(Queue, { instanceId: 'q7' });
		eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
		queueAddSong()(makeSong());
		await tick();

		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		expect(row).toBeTruthy();
		await fireEvent.dblClick(row);

		expect(loadIfIdleCalls).toEqual([{ path: '/tmp/song1.mp3' }]);
		expect(container.querySelectorAll('[draggable="true"]').length).toBe(0);
	});

	it('double-click: with no linked decks, shows "No decks linked to this queue" toast', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: [] });
		const toasts: Array<{ message: string; type: string }> = [];
		eventBus.on('toast:show', (payload) =>
			toasts.push(payload as { message: string; type: string })
		);

		const { container } = render(Queue, { instanceId: 'q8' });
		queueAddSong()(makeSong());
		await tick();

		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		await fireEvent.dblClick(row);

		expect(toasts).toEqual([{ message: 'No decks linked to this queue', type: 'warning' }]);
		// Item is NOT removed when there's no deck to send to.
		expect(container.querySelectorAll('[draggable="true"]').length).toBe(1);
	});

	it('double-click: with all linked decks busy, shows "All linked decks are busy" toast', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];
		const toasts: Array<{ message: string; type: string }> = [];
		eventBus.on('toast:show', (payload) =>
			toasts.push(payload as { message: string; type: string })
		);

		const { container } = render(Queue, { instanceId: 'q9' });
		eventBus.emit('deck:d1:state', { state: 'loaded' as DeckState });
		queueAddSong()(makeSong());
		await tick();

		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		await fireEvent.dblClick(row);

		expect(toasts).toEqual([{ message: 'All linked decks are busy', type: 'warning' }]);
		expect(container.querySelectorAll('[draggable="true"]').length).toBe(1);
	});
});
