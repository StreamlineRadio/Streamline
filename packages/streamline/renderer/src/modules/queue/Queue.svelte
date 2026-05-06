<script lang="ts">
	import type { Song } from '@streamline/shared';

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

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function addSong(song: Song) {
		items = [...items, { id: crypto.randomUUID(), song, position: items.length }];
	}

	function removeSong(id: string) {
		items = items.filter((i) => i.id !== id);
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
		items = items.map((item, i) => ({ ...item, position: i }));
	}

	function clearItems() {
		items = [];
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
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
			class="ml-auto rounded bg-primary-700 px-2 py-1 text-xs hover:bg-primary-600"
			onclick={clearItems}
		>
			Clear
		</button>
	</div>

	<!-- Song list -->
	<div class="flex-1 overflow-y-auto">
		{#each items as item, i (item.id)}
			<div
				class="group flex cursor-pointer items-center gap-2 border-b border-primary-800 px-3 py-2 hover:bg-primary-800"
				draggable="true"
				ondragstart={() => (dragIndex = i)}
				ondragover={(e) => {
					e.preventDefault();
				}}
				ondrop={(e) => {
					e.preventDefault();
					if (dragIndex !== null && dragIndex !== i) {
						moveItem(dragIndex, i);
					}
					dragIndex = null;
				}}
			>
				<span class="w-5 text-right text-xs text-primary-500">{i + 1}</span>
				<div class="flex-1 overflow-hidden">
					<div class="truncate text-sm">{item.song.title ?? item.song.path.split('/').pop()}</div>
					<div class="truncate text-xs text-primary-400">{item.song.artist ?? ''}</div>
				</div>
				<button
					class="text-xs text-danger-400 opacity-0 group-hover:opacity-100 hover:text-danger-300"
					onclick={() => removeSong(item.id)}
				>
					✕
				</button>
			</div>
		{:else}
			<div class="flex items-center justify-center h-full text-primary-500 text-sm">
				Drop songs here or drag from library
			</div>
		{/each}
	</div>
</div>
