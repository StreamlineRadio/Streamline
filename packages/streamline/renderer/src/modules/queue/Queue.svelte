<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faPlus,
		faFolderPlus,
		faArrowRotateRight,
		faPlay,
		faTrashCan,
		faMusic
	} from '@fortawesome/free-solid-svg-icons';
	import type { Song } from '@streamline/shared';
	import IconButton from '../../components/IconButton.svelte';
	import { setSongDragData } from '../../drag-drop/song-drag';
	import { eventBus } from '../event-bus';
	import { layoutStore } from '../../layout/store.svelte';

	interface Props {
		instanceId: string;
	}

	const { instanceId }: Props = $props();

	interface QueueItem {
		id: string;
		song: Song;
		position: number;
	}

	let items = $state<QueueItem[]>([]);
	let autoplay = $state(false);
	let dragIndex = $state<number | null>(null);
	// Absolute ms timestamp when the first queue item is expected to start.
	// Updated by deck emissions so it stays approximately constant during playback,
	// which avoids flicker from two independent 1-second timers.
	let deckEtaBase = $state<number | null>(null);
	// Updated every second when no deck is connected so ETA still ticks forward.
	let now = $state(Date.now());

	const deckRemainingPerDeck = new SvelteMap<string, number>();
	let loadingInProgress = false;

	let nowTimer: ReturnType<typeof setInterval>;
	let unsubNext: (() => void) | null = null;
	let unsubDeckState: (() => void) | null = null;

	const totalDurationSec = $derived(
		items.reduce((sum, item) => sum + (item.song.durationSec ?? 0), 0)
	);

	onMount(() => {
		nowTimer = setInterval(() => {
			// Skip when a deck is connected — deckEtaBase updates drive ETA instead
			if (deckEtaBase === null) now = Date.now();
		}, 1000);

		unsubNext = eventBus.on(`queue:${instanceId}:request-next`, (deckId) => {
			if (!autoplay || items.length === 0) return;
			if (loadingInProgress) return;
			// Only fire when ALL connected decks have finished (remaining = 0)
			const allFinished = Array.from(deckRemainingPerDeck.values()).every((r) => r === 0);
			if (!allFinished) return;
			loadingInProgress = true;
			const [first, ...rest] = items;
			items = rest;
			reindex();
			eventBus.emit(`deck:${deckId as string}:load-song`, first.song.path);
		});

		unsubDeckState = eventBus.on(`queue:${instanceId}:deck-remaining`, (payload) => {
			const { deckId, remaining } = payload as { deckId: string; remaining: number };
			deckRemainingPerDeck.set(deckId, remaining);
			// Deck started playing — the load completed, allow future autoplay triggers
			if (remaining > 0) loadingInProgress = false;
			const maxRemaining =
				deckRemainingPerDeck.size > 0 ? Math.max(...Array.from(deckRemainingPerDeck.values())) : 0;
			// Store as absolute future timestamp — stays ~constant during playback
			deckEtaBase = Date.now() + maxRemaining * 1000;
		});
	});

	onDestroy(() => {
		clearInterval(nowTimer);
		unsubNext?.();
		unsubDeckState?.();
	});

	function addSong(song: Song) {
		items = [...items, { id: crypto.randomUUID(), song, position: items.length }];
	}

	function removeSong(id: string) {
		items = items.filter((item) => item.id !== id);
		reindex();
	}

	function moveItem(from: number, to: number) {
		const arr = [...items];
		const [moved] = arr.splice(from, 1);
		arr.splice(to, 0, moved);
		items = arr;
		reindex();
	}

	function reindex() {
		items = items.map((item, index) => ({ ...item, position: index }));
	}

	function formatDuration(seconds: number | null): string {
		if (seconds === null) return '--:--';
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}

	function formatTotalDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}

	function formatEta(cumulativeSeconds: number): string {
		// deckEtaBase is when item 0 starts; fall back to now when no deck is connected
		const base = deckEtaBase ?? now;
		const eta = new Date(base + cumulativeSeconds * 1000);
		return `${eta.getHours().toString().padStart(2, '0')}:${eta.getMinutes().toString().padStart(2, '0')}:${eta.getSeconds().toString().padStart(2, '0')}`;
	}

	function songLabel(song: Song): string {
		const filename =
			song.path
				.split('/')
				.pop()
				?.replace(/\.[^.]+$/, '') ?? song.path;
		if (song.title && song.artist) return `${song.artist} - ${song.title}`;
		if (song.title) return song.title;
		return filename;
	}

	function cumulativeDuration(upToIndex: number): number {
		let total = 0;
		for (let index = 0; index < upToIndex; index++) {
			const duration = items[index]?.song.durationSec;
			if (duration !== null && duration !== undefined) total += duration;
		}
		return total;
	}

	function clearItems() {
		items = [];
	}

	async function addFolder() {
		const folder = await window.streamline.api.system.selectFolder();
		if (folder) await window.streamline.api.library.addFolder(folder);
	}

	async function songFromPath(path: string): Promise<Song> {
		const match = await window.streamline.api.library.getSongByPath(path);
		if (match) return match;
		const meta = await window.streamline.api.library.getFileMetadata(path);
		if (meta) return { ...meta, id: crypto.randomUUID() };
		return {
			id: crypto.randomUUID(),
			path,
			title: null,
			artist: null,
			album: null,
			durationSec: null,
			sampleRate: null,
			channels: null,
			bitrateKbps: null,
			codec: null,
			artworkPath: null,
			waveformPath: null,
			fileSize: null,
			fileMtime: null,
			addedAt: Date.now(),
			lastPlayedAt: null,
			playCount: 0,
			missing: false
		};
	}

	async function addSongFile() {
		const path = await window.streamline.api.system.selectFile([
			{ name: 'Audio Files', extensions: ['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'opus'] }
		]);
		if (path) addSong(await songFromPath(path));
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragIndex = null;
		if (e.dataTransfer && e.dataTransfer.files.length > 0) {
			for (const file of Array.from(e.dataTransfer.files)) {
				addSong(await songFromPath(window.streamline.getPathForFile(file)));
			}
		}
	}

	async function handleRowDrop(e: DragEvent, targetIndex: number) {
		e.preventDefault();
		if (e.dataTransfer && e.dataTransfer.files.length > 0) {
			for (const file of Array.from(e.dataTransfer.files)) {
				addSong(await songFromPath(window.streamline.getPathForFile(file)));
			}
		} else if (dragIndex !== null && dragIndex !== targetIndex) {
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
			moveItem(dragIndex, targetIndex);
		}
		dragIndex = null;
	}

	function handleRowDragStart(e: DragEvent, item: QueueItem, index: number) {
		dragIndex = index;
		setSongDragData(e, item.song);
	}

	function handleRowDragEnd(e: DragEvent, item: QueueItem) {
		if (e.dataTransfer?.dropEffect === 'move') {
			removeSong(item.id);
		}
		dragIndex = null;
	}

	function showToast(message: string, type: 'error' | 'warning' | 'info' = 'info') {
		eventBus.emit('toast:show', { message, type });
	}

	function tryLoadOnDeck(deckId: string, path: string): boolean {
		let accepted = false;
		eventBus.emit(`deck:${deckId}:load-if-idle`, {
			path,
			onAccept: () => {
				accepted = true;
			}
		});
		return accepted;
	}

	function playOnFirstAvailableDeck(item: QueueItem) {
		const layout = layoutStore.active;
		if (!layout) {
			showToast('No layout active', 'error');
			return;
		}

		const connectedDecks = layout.instances
			.filter((instance) => instance.moduleId === 'deck')
			.filter(() => false)
			.sort((a, b) => a.y - b.y || a.x - b.x);

		if (connectedDecks.length === 0) {
			showToast('No deck connected to this queue', 'warning');
			return;
		}

		for (const deck of connectedDecks) {
			if (tryLoadOnDeck(deck.id, item.song.path)) {
				removeSong(item.id);
				return;
			}
		}

		showToast('All decks are busy', 'warning');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex h-full flex-col select-none"
	ondrop={handleDrop}
	ondragover={(e) => e.preventDefault()}
>
	<!-- Toolbar: add actions on left, state/destructive actions on right -->
	<div class="flex shrink-0 items-center justify-between border-b border-primary-800 px-2 py-2">
		<div class="flex items-center gap-1">
			<IconButton icon={faPlus} title="Add song" onclick={addSongFile} />
			<IconButton icon={faFolderPlus} title="Add folder to library" onclick={addFolder} />
		</div>

		<div class="flex items-center gap-1">
			<button
				title={autoplay ? 'Autoplay on' : 'Autoplay off'}
				onclick={() => (autoplay = !autoplay)}
				class={[
					'flex h-10 w-10 items-center justify-center rounded border text-base transition-colors',
					autoplay
						? 'border-secondary-600 bg-primary-800 text-secondary-400'
						: 'border-primary-700 bg-primary-800 text-primary-200 hover:border-primary-600 hover:bg-primary-700 hover:text-primary-50'
				]}
			>
				<span class="relative inline-block leading-none">
					<FontAwesomeIcon icon={faArrowRotateRight} />
					<span
						class="absolute inset-0 flex items-center justify-center"
						style="font-size: 0.42em;"
					>
						<FontAwesomeIcon icon={faPlay} />
					</span>
				</span>
			</button>
			<IconButton icon={faTrashCan} title="Clear queue" onclick={clearItems} destructive />
		</div>
	</div>

	<!-- Column headers -->
	<div class="flex shrink-0 items-center gap-2 border-b border-primary-800 px-3 py-1">
		<span class="queue-label w-16 shrink-0 text-right">ETA</span>
		<span class="queue-label flex-1">Song</span>
		<span class="queue-label w-12 shrink-0 text-right">Length</span>
		<span class="w-6 shrink-0"></span>
	</div>

	<!-- Song list (scrollable, min-h-0 prevents flex overflow) -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#each items as item, i (item.id)}
			{@const eta = cumulativeDuration(i)}
			<div
				class="group relative flex cursor-pointer items-center gap-2 border-b border-primary-800/50 px-3 py-1 transition-colors hover:bg-primary-900"
				draggable="true"
				ondragstart={(e) => handleRowDragStart(e, item, i)}
				ondragend={(e) => handleRowDragEnd(e, item)}
				ondragover={(e) => e.preventDefault()}
				ondrop={(e) => handleRowDrop(e, i)}
				ondblclick={() => playOnFirstAvailableDeck(item)}
			>
				{#if i === 0}
					<div class="absolute inset-y-0 left-0 w-0.5 bg-secondary-500"></div>
				{/if}
				<span class="w-16 shrink-0 text-right font-mono text-xs text-primary-300">
					{formatEta(eta)}
				</span>
				<span class="flex-1 truncate text-xs text-primary-100">
					{songLabel(item.song)}
				</span>
				<span class="w-12 shrink-0 text-right font-mono text-xs text-primary-300">
					{formatDuration(item.song.durationSec)}
				</span>
				<button
					title="Remove from queue"
					onclick={(e) => {
						e.stopPropagation();
						removeSong(item.id);
					}}
					ondblclick={(e) => e.stopPropagation()}
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs text-primary-600 transition-colors group-hover:text-primary-300 hover:bg-danger-950 hover:text-danger-400"
				>
					<FontAwesomeIcon icon={faTrashCan} />
				</button>
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
				<div class="text-4xl text-primary-700">
					<FontAwesomeIcon icon={faMusic} />
				</div>
				<div class="text-sm font-medium text-primary-400">Queue is empty</div>
				<div class="text-xs text-primary-600">Drop songs here or use the buttons above</div>
			</div>
		{/each}
	</div>

	<!-- Footer: track count + total duration -->
	{#if items.length > 0}
		<div
			class="flex shrink-0 items-center justify-between border-t border-primary-800 bg-primary-900 px-3 py-1.5"
		>
			<span class="text-xs text-primary-400">
				{items.length} track{items.length !== 1 ? 's' : ''}
			</span>
			<span class="font-mono text-xs text-primary-300">
				{formatTotalDuration(totalDurationSec)} total
			</span>
		</div>
	{/if}
</div>

<style>
	.queue-label {
		font-size: 0.55rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-primary-500);
		line-height: 1;
	}
</style>
