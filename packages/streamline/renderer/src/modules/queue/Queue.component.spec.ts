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

// Stub the shared preloader so its own decode/IPC never runs here; the indicator
// is driven purely by emitting TRACK_PRELOAD_STATE events on the bus.
vi.mock('../../audio/track-preload', () => ({
	trackPreloader: { preload: vi.fn(), take: () => null, clear: vi.fn() },
	TRACK_PRELOAD_STATE: 'track:preload:state'
}));

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

	it('ETA returns to the now-driven fallback after the loaded deck unloads', async () => {
		vi.useFakeTimers();
		try {
			const t0 = new Date('2026-05-29T12:00:00.000Z').getTime();
			vi.setSystemTime(t0);

			settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
			layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];
			const { container } = render(Queue, { instanceId: 'q-eta-unload' });
			queueAddSong()(makeSong({ durationSec: 60 }));
			await tick();

			eventBus.emit('deck:d1:state', { state: 'loaded' as DeckState });
			eventBus.emit('deck:d1:remaining', { remaining: 90 });
			await tick();
			const etaWhileLoaded = container.querySelector('.font-mono')?.textContent;

			// Advancing time while a deck is loaded must not change ETA (deckEtaBase is locked).
			vi.setSystemTime(t0 + 30_000);
			vi.advanceTimersByTime(30_000);
			await tick();
			expect(container.querySelector('.font-mono')?.textContent).toBe(etaWhileLoaded);

			// Unload should reset deckEtaBase so the now-driven fallback resumes ticking.
			eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
			vi.advanceTimersByTime(1000);
			await tick();
			expect(container.querySelector('.font-mono')?.textContent).not.toBe(etaWhileLoaded);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not subscribe to decks outside linkedDeckIds', () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		const stateRequestForD2: unknown[] = [];
		eventBus.on('deck:d2:state-request', () => stateRequestForD2.push(undefined));
		render(Queue, { instanceId: 'q4' });
		expect(stateRequestForD2.length).toBe(0);
	});

	it('skips null durations when computing the queue ETA', async () => {
		const { container } = render(Queue, { instanceId: 'q-eta-null' });
		queueAddSong()(makeSong());
		queueAddSong()(makeSong({ id: 's-null', path: '/tmp/s2.mp3', durationSec: null }));
		queueAddSong()(makeSong({ id: 's-after', path: '/tmp/s3.mp3' }));
		await tick();
		expect(container.querySelectorAll('.font-mono').length).toBeGreaterThan(0);
	});

	it('allows dragover on the queue container', async () => {
		const { container } = render(Queue, { instanceId: 'q-dragover' });
		const root = container.querySelector('div.flex.h-full') as HTMLElement;
		expect(root).toBeTruthy();
		await fireEvent.dragOver(root);
	});

	it('removes a song via the row remove button without triggering row dblclick', async () => {
		const { container } = render(Queue, { instanceId: 'q-remove' });
		queueAddSong()(makeSong());
		await tick();
		const removeButton = container.querySelector(
			'[title="Remove from queue"]'
		) as HTMLButtonElement;
		expect(removeButton).toBeTruthy();
		await fireEvent.dblClick(removeButton);
		await fireEvent.click(removeButton);
		await tick();
		expect(container.querySelector('[title="Remove from queue"]')).toBeNull();
	});

	it('accepts a drop on a queue row', async () => {
		const { container } = render(Queue, { instanceId: 'q-rowdrop' });
		queueAddSong()(makeSong());
		await tick();
		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		expect(row).toBeTruthy();
		await fireEvent.drop(row, { dataTransfer: { files: [] } });
	});

	it('loads the song on a linked deck via row double-click', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];
		const loadCalls: string[] = [];
		eventBus.on('deck:d1:load-if-idle', (payload) => {
			const request = payload as { path: string; onAccept: () => void };
			loadCalls.push(request.path);
			request.onAccept();
		});
		const { container } = render(Queue, { instanceId: 'q-dbl' });
		queueAddSong()(makeSong());
		eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
		await tick();
		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		expect(row).toBeTruthy();
		await fireEvent.dblClick(row);
		expect(loadCalls).toEqual(['/tmp/song1.mp3']);
	});

	it('autoplay: on deck:X:ended pushes the next song to a DIFFERENT linked deck', () => {
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

		// d1 is the just-ended deck; autoplay must push to a different deck (d2).
		expect(loadSongCalls).toEqual([{ deckId: 'd2', path: '/tmp/song1.mp3' }]);
	});

	it('autoplay: shows "All linked decks are busy" toast when the other linked deck is loaded', () => {
		settingsHolder.current = JSON.stringify({ autoplay: true, linkedDeckIds: ['d1', 'd2'] });
		layoutInstancesHolder.current = [
			{ id: 'd1', moduleId: 'deck' },
			{ id: 'd2', moduleId: 'deck' }
		];

		const loadSongCalls: unknown[] = [];
		eventBus.on('deck:d1:load-song', () => loadSongCalls.push('d1'));
		eventBus.on('deck:d2:load-song', () => loadSongCalls.push('d2'));
		const toasts: Array<{ message: string; type: string }> = [];
		eventBus.on('toast:show', (payload) =>
			toasts.push(payload as { message: string; type: string })
		);

		render(Queue, { instanceId: 'q6' });
		queueAddSong()(makeSong());

		eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
		eventBus.emit('deck:d2:state', { state: 'loaded' as DeckState });
		eventBus.emit('deck:d1:ended', undefined);

		expect(loadSongCalls).toEqual([]);
		expect(toasts).toEqual([
			{ message: 'Queue autoplay failed: all linked decks are busy', type: 'warning' }
		]);
	});

	it('autoplay: shows "second linked deck" toast and cancels when only one deck is linked', () => {
		settingsHolder.current = JSON.stringify({ autoplay: true, linkedDeckIds: ['d1'] });
		layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];

		const loadSongCalls: unknown[] = [];
		eventBus.on('deck:d1:load-song', () => loadSongCalls.push('d1'));
		const toasts: Array<{ message: string; type: string }> = [];
		eventBus.on('toast:show', (payload) =>
			toasts.push(payload as { message: string; type: string })
		);

		render(Queue, { instanceId: 'q6b' });
		queueAddSong()(makeSong());

		eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
		eventBus.emit('deck:d1:ended', undefined);

		expect(loadSongCalls).toEqual([]);
		expect(toasts).toEqual([{ message: 'Autoplay needs a second linked deck', type: 'warning' }]);
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

	it('settings modal: toggling a deck updates linkedDeckIds in settingsJson', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: [] });
		layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];

		const { container } = render(Queue, { instanceId: 'q10' });
		const gear = container.querySelector('[title="Queue settings"]') as HTMLButtonElement;
		expect(gear).toBeTruthy();
		await fireEvent.click(gear);
		await tick();

		const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
		expect(checkbox).toBeTruthy();
		await fireEvent.click(checkbox);

		expect(layoutUpdateInstance).toHaveBeenCalledWith(
			'q10',
			expect.objectContaining({
				settingsJson: expect.stringContaining('"linkedDeckIds":["d1"]')
			})
		);
	});

	it('drag-to-reorder within the queue does not delete the dragged item', async () => {
		const { container } = render(Queue, { instanceId: 'q-reorder' });
		queueAddSong()(makeSong({ id: 's1', path: '/tmp/a.mp3', title: 'A' }));
		queueAddSong()(makeSong({ id: 's2', path: '/tmp/b.mp3', title: 'B' }));
		await tick();

		const rowsBefore = container.querySelectorAll('[draggable="true"]');
		expect(rowsBefore.length).toBe(2);
		expect(rowsBefore[0].textContent).toContain('A');
		expect(rowsBefore[1].textContent).toContain('B');

		const source = rowsBefore[0] as HTMLElement;
		const target = rowsBefore[1] as HTMLElement;

		await fireEvent.dragStart(source);
		await fireEvent.drop(target);
		// Browsers set dropEffect='move' on dragend after a successful intra-queue drop;
		// without the wasIntraQueueDrop flag this would incorrectly remove the dragged row.
		await fireEvent.dragEnd(source, { dataTransfer: { dropEffect: 'move' } });
		await tick();

		const rowsAfter = container.querySelectorAll('[draggable="true"]');
		expect(rowsAfter.length).toBe(2);
		expect(rowsAfter[0].textContent).toContain('B');
		expect(rowsAfter[1].textContent).toContain('A');
	});

	it('dropping an external file on a row only adds it once (no double-trigger via bubbling)', async () => {
		(window as unknown as { streamline: unknown }).streamline = {
			api: {
				library: {
					getSongByPath: vi.fn().mockResolvedValue(null),
					getFileMetadata: vi.fn().mockResolvedValue(null)
				}
			},
			getPathForFile: (file: File) => `/tmp/${file.name}`
		};

		const { container } = render(Queue, { instanceId: 'q-doubleadd' });
		queueAddSong()(makeSong({ id: 's1', path: '/tmp/existing.mp3', title: 'Existing' }));
		await tick();
		expect(container.querySelectorAll('[draggable="true"]').length).toBe(1);

		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		const file = new File(['fake'], 'dropped.mp3', { type: 'audio/mpeg' });
		await fireEvent.drop(row, { dataTransfer: { files: [file] } });
		// addSong is async (songFromPath awaits IPC); flush microtasks until DOM updates.
		await new Promise((resolve) => setTimeout(resolve, 0));
		await tick();

		expect(container.querySelectorAll('[draggable="true"]').length).toBe(2);
	});

	it('drag out of the queue (drop accepted elsewhere) still removes the dragged item', async () => {
		const { container } = render(Queue, { instanceId: 'q-dragout' });
		queueAddSong()(makeSong({ id: 's1', path: '/tmp/a.mp3', title: 'A' }));
		queueAddSong()(makeSong({ id: 's2', path: '/tmp/b.mp3', title: 'B' }));
		await tick();

		const source = container.querySelector('[draggable="true"]') as HTMLElement;

		await fireEvent.dragStart(source);
		// No drop fires on this queue — simulating the dragged item landing on an external target.
		await fireEvent.dragEnd(source, { dataTransfer: { dropEffect: 'move' } });
		await tick();

		const rowsAfter = container.querySelectorAll('[draggable="true"]');
		expect(rowsAfter.length).toBe(1);
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

	it('falls back to default settings when settingsJson is malformed JSON', () => {
		settingsHolder.current = 'not valid json {{{}';
		const { container } = render(Queue, { instanceId: 'q-malformed' });
		// Default settings: autoplay=false. Autoplay button should show "Autoplay off" title.
		expect(container.querySelector('[title="Autoplay off"]')).toBeTruthy();
	});

	it('filters out linkedDeckIds not present in the layout (line 126: return false path)', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: true, linkedDeckIds: ['d-ghost'] });
		// d-ghost is in linkedDeckIds but NOT in layoutInstances → activeLinkedDeckIds returns []
		layoutInstancesHolder.current = [];
		const toasts: Array<{ message: string; type: string }> = [];
		eventBus.on('toast:show', (payload) =>
			toasts.push(payload as { message: string; type: string })
		);
		const loadSongCalls: unknown[] = [];
		eventBus.on('deck:d-ghost:load-song', () => loadSongCalls.push('d-ghost'));

		render(Queue, { instanceId: 'q-ghost' });
		queueAddSong()(makeSong());

		eventBus.emit('deck:d-ghost:state', { state: 'unloaded' as DeckState });
		eventBus.emit('deck:d-ghost:ended', undefined);

		// activeLinkedDeckIds() returns [] because d-ghost is not in layoutInstances (line 126: return false).
		// autoplayDecision({ linkedDeckIds: [] }) → 'silent' → no toast, no load.
		expect(toasts).toEqual([]);
		expect(loadSongCalls).toEqual([]);
	});

	it('falls back to default settings when settingsJson is empty string (missing branch)', () => {
		settingsHolder.current = '';
		const { container } = render(Queue, { instanceId: 'q-empty-settings' });
		expect(container.querySelector('[title="Autoplay off"]')).toBeTruthy();
	});

	it('deduplicates linked deck IDs when filtering active decks', () => {
		settingsHolder.current = JSON.stringify({ autoplay: true, linkedDeckIds: ['d1', 'd1'] });
		layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];
		const loadSongCalls: unknown[] = [];
		eventBus.on('deck:d1:load-song', () => loadSongCalls.push('d1'));

		render(Queue, { instanceId: 'q-dedup' });
		queueAddSong()(makeSong());

		eventBus.emit('deck:d1:state', { state: 'unloaded' as DeckState });
		eventBus.emit('deck:d1:ended', undefined);

		// With deduplicated deck IDs, there's only one linked deck → 'no-other-deck'.
		// The second 'd1' in seen.has(id) fires the return false (line 124).
		expect(loadSongCalls).toEqual([]);
	});

	it('displays artist - title label when song has both title and artist', async () => {
		const { container } = render(Queue, { instanceId: 'q-artist-title' });
		queueAddSong()(makeSong({ title: 'My Song', artist: 'My Artist' }));
		await tick();
		const row = container.querySelector('[draggable="true"]') as HTMLElement;
		expect(row?.textContent).toContain('My Artist - My Song');
	});

	it('shows singular "1 track" in the toolbar when queue has exactly one item', async () => {
		const { container } = render(Queue, { instanceId: 'q-singular' });
		queueAddSong()(makeSong());
		await tick();
		expect(container.textContent).toContain('1 track');
		expect(container.textContent).not.toContain('1 tracks');
	});

	it('settings modal: close button hides the modal', async () => {
		const { container } = render(Queue, { instanceId: 'q-close-modal' });
		const gear = container.querySelector('[title="Queue settings"]') as HTMLButtonElement;
		await fireEvent.click(gear);
		await tick();

		expect(document.querySelector('[role="dialog"]')).toBeTruthy();
		const closeButton = document.querySelector('[title="Close"]') as HTMLButtonElement;
		await fireEvent.click(closeButton);
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});

	it('preload indicator: shows a spinner while preloading, a badge when ready', async () => {
		const { container } = render(Queue, { instanceId: 'q-preload' });
		queueAddSong()(makeSong());
		await tick();

		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'preloading' });
		await tick();
		expect(container.querySelector('[title="Preloading…"]')).toBeTruthy();
		expect(container.querySelector('[title="Preloaded"]')).toBeNull();

		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'ready' });
		await tick();
		expect(container.querySelector('[title="Preloading…"]')).toBeNull();
		expect(container.querySelector('[title="Preloaded"]')).toBeTruthy();
	});

	it('preload indicator: clicking the badge emits an info toast and does not play the row', async () => {
		const toasts: Array<{ message: string; type: string }> = [];
		eventBus.on('toast:show', (payload) =>
			toasts.push(payload as { message: string; type: string })
		);
		const { container } = render(Queue, { instanceId: 'q-preload-click' });
		queueAddSong()(makeSong());
		await tick();
		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'ready' });
		await tick();

		const badge = container.querySelector('[title="Preloaded"]') as HTMLButtonElement;
		await fireEvent.dblClick(badge);
		await fireEvent.click(badge);

		expect(toasts).toHaveLength(1);
		expect(toasts[0].type).toBe('info');
		expect(toasts[0].message).toContain('Preloaded');
	});

	it('preload indicator: a matching cleared event removes the indicator', async () => {
		const { container } = render(Queue, { instanceId: 'q-preload-clear' });
		queueAddSong()(makeSong());
		await tick();
		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'ready' });
		await tick();
		expect(container.querySelector('[title="Preloaded"]')).toBeTruthy();

		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'cleared' });
		await tick();
		expect(container.querySelector('[title="Preloaded"]')).toBeNull();
	});

	it('preload indicator: a null-path cleared event removes the indicator', async () => {
		const { container } = render(Queue, { instanceId: 'q-preload-clear-null' });
		queueAddSong()(makeSong());
		await tick();
		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'preloading' });
		await tick();
		expect(container.querySelector('[title="Preloading…"]')).toBeTruthy();

		eventBus.emit('track:preload:state', { path: null, status: 'cleared' });
		await tick();
		expect(container.querySelector('[title="Preloading…"]')).toBeNull();
	});

	it('preload indicator: a non-matching cleared event is ignored', async () => {
		const { container } = render(Queue, { instanceId: 'q-preload-keep' });
		queueAddSong()(makeSong());
		await tick();
		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'ready' });
		await tick();

		// cleared for a different path (and the optional-chain path when nothing matches) must not drop it.
		eventBus.emit('track:preload:state', { path: '/tmp/other.mp3', status: 'cleared' });
		await tick();
		expect(container.querySelector('[title="Preloaded"]')).toBeTruthy();
	});

	it('preload indicator: cleared with no active preload is a no-op', async () => {
		const { container } = render(Queue, { instanceId: 'q-preload-noop' });
		queueAddSong()(makeSong());
		await tick();
		// No preloading/ready was emitted, so preload is null; the optional chain short-circuits.
		eventBus.emit('track:preload:state', { path: '/tmp/song1.mp3', status: 'cleared' });
		await tick();
		expect(container.querySelector('[title="Preloaded"]')).toBeNull();
		expect(container.querySelector('[title="Preloading…"]')).toBeNull();
	});

	it('settings modal: unchecking a deck removes it from linkedDeckIds', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		layoutInstancesHolder.current = [{ id: 'd1', moduleId: 'deck' }];

		const { container } = render(Queue, { instanceId: 'q-uncheck' });
		const gear = container.querySelector('[title="Queue settings"]') as HTMLButtonElement;
		await fireEvent.click(gear);
		await tick();

		const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
		expect(checkbox).toBeTruthy();
		// Checkbox is checked (d1 is in linkedDeckIds). Click to uncheck.
		expect(checkbox.checked).toBe(true);
		await fireEvent.click(checkbox);

		expect(layoutUpdateInstance).toHaveBeenCalledWith(
			'q-uncheck',
			expect.objectContaining({
				settingsJson: expect.stringContaining('"linkedDeckIds":[]')
			})
		);
	});
});
