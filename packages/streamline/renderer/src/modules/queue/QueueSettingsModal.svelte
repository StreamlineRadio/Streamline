<script lang="ts">
	import { faGear } from '@fortawesome/free-solid-svg-icons';
	import Modal from '../../components/Modal.svelte';
	import { layoutStore } from '../../layout/store.svelte';

	interface Props {
		linkedDeckIds: string[];
		preloadCount: number;
		onToggleDeck: (deckId: string, linked: boolean) => void;
		onPreloadCountChange: (count: number) => void;
		onClose: () => void;
	}

	const { linkedDeckIds, preloadCount, onToggleDeck, onPreloadCountChange, onClose }: Props =
		$props();

	const deckOptions = $derived(
		(layoutStore.active?.instances ?? [])
			.filter((instance) => instance.moduleId === 'deck')
			.slice()
			.sort((a, b) => a.y - b.y || a.x - b.x)
			.map((instance) => ({
				id: instance.id,
				title: instance.title || `Deck ${instance.id.slice(0, 4)}`
			}))
	);
</script>

<Modal title="Queue settings" icon={faGear} {onClose} width="24rem">
	<section class="flex flex-col gap-2">
		<header>
			<div class="text-sm font-semibold text-primary-100">Autoplay decks</div>
			<div class="text-xs text-primary-500">Decks this queue may push to.</div>
		</header>

		{#if deckOptions.length === 0}
			<div class="rounded border border-dashed border-primary-700 p-3 text-xs text-primary-500">
				No decks in the active layout.
			</div>
		{:else}
			<ul class="flex flex-col">
				{#each deckOptions as deck (deck.id)}
					<li>
						<label class="flex cursor-pointer items-center gap-2 py-1 text-primary-200">
							<input
								type="checkbox"
								checked={linkedDeckIds.includes(deck.id)}
								onchange={(e) => onToggleDeck(deck.id, (e.target as HTMLInputElement).checked)}
								class="accent-secondary-500"
							/>
							<span>{deck.title}</span>
						</label>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="mt-4 flex flex-col gap-2">
		<header>
			<div class="text-sm font-semibold text-primary-100">Preload first N tracks</div>
			<div class="text-xs text-primary-500">
				Decode this many upcoming tracks ahead so autoplay starts with no gap. Higher values greatly
				increase RAM use (~92 MB per track).
			</div>
		</header>
		<input
			type="number"
			min="1"
			max="20"
			value={preloadCount}
			onchange={(e) =>
				onPreloadCountChange(Math.max(1, Math.round(Number((e.target as HTMLInputElement).value))))}
			class="w-20 rounded border border-primary-700 bg-primary-900 px-2 py-1 text-sm text-primary-100"
		/>
	</section>
</Modal>
