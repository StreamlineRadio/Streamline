<script lang="ts">
	import { faGear } from '@fortawesome/free-solid-svg-icons';
	import Modal from '../../components/Modal.svelte';
	import { layoutStore } from '../../layout/store.svelte';

	interface Props {
		linkedDeckIds: string[];
		onToggleDeck: (deckId: string, linked: boolean) => void;
		onClose: () => void;
	}

	const { linkedDeckIds, onToggleDeck, onClose }: Props = $props();

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
</Modal>
