<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { Song } from '@streamline/shared';
	import { setSongDragData } from '../../drag-drop/song-drag';
	import { eventBus } from '../event-bus';

	interface Props {
		instanceId: string;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex h-full flex-col" ondrop={handleDrop} ondragover={(e) => e.preventDefault()}>
	<!-- Toolbar -->
	<div class="flex items-center gap-2 border-b border-primary-700 p-2">
		<label class="flex cursor-pointer items-center gap-1 text-xs text-primary-300">
			<input type="checkbox" bind:checked={autoplay} class="accent-secondary-500" />
			Autoplay
		</label>
		<span class="text-xs text-primary-500">{items.length} track{items.length !== 1 ? 's' : ''}</span
		>
		<button
			class="rounded bg-primary-700 px-2 py-1 text-xs hover:bg-primary-600"
			onclick={addFolder}
			title="Add folder to library"
		>
			+ Folder
		</button>
		<button
			class="rounded bg-primary-700 px-2 py-1 text-xs hover:bg-primary-600"
			onclick={addSongFile}
			title="Add audio file to queue"
		>
			+ Song
		</button>
		<button
			class="ml-auto rounded bg-primary-700 px-2 py-1 text-xs hover:bg-primary-600"
			onclick={clearItems}
		>
			Clear
		</button>
	</div>

	<!-- Column headers (outside scroll area so they stay fixed) -->
	<div
		class="flex shrink-0 items-center gap-2 border-b border-primary-700 px-3 py-1 text-xs text-primary-400"
	>
		<span class="w-20 shrink-0 text-right">ETA</span>
		<span class="flex-1">Song</span>
		<span class="w-10 shrink-0 text-right">Length</span>
		<span class="w-4"></span>
	</div>

	<!-- Song list (scrollable, min-h-0 prevents flex overflow) -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		{#each items as item, i (item.id)}
			{@const eta = cumulativeDuration(i)}
			<div
				class="group flex cursor-pointer items-center gap-2 border-b border-primary-800 px-3 py-2 hover:bg-primary-800"
				draggable="true"
				ondragstart={(e) => handleRowDragStart(e, item, i)}
				ondragend={(e) => handleRowDragEnd(e, item)}
				ondragover={(e) => {
					e.preventDefault();
				}}
				ondrop={(e) => handleRowDrop(e, i)}
			>
				<span class="w-20 shrink-0 text-right font-mono text-xs text-primary-300">
					{formatEta(eta)}
				</span>
				<span class="flex-1 truncate text-sm text-primary-100">{songLabel(item.song)}</span>
				<span class="w-10 shrink-0 text-right font-mono text-xs text-primary-300"
					>{formatDuration(item.song.durationSec)}</span
				>
				<button
					class="w-4 text-xs text-danger-400 opacity-0 group-hover:opacity-100 hover:text-danger-300"
					onclick={() => removeSong(item.id)}
				>
					✕
				</button>
			</div>
		{:else}
			<div class="flex h-full items-center justify-center text-sm text-primary-500">
				Drop songs here or drag from library
			</div>
		{/each}
	</div>
</div>
