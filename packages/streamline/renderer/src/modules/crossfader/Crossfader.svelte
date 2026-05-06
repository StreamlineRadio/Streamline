<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { CurveType } from './curves';
	import { applyCurve } from './curves';
	import { instanceStore } from '../instance-store.svelte';
	import { eventBus } from '../event-bus';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	let position = $state(0);
	let curve = $state<CurveType>('equal-power');
	let leftDeckId = $state('');
	let rightDeckId = $state('');
	let fadeDurationSec = $state(4);
	let isAnimating = $state(false);

	let animRaf: number | null = null;

	const decks = $derived(
		[...instanceStore.all.values()]
			.filter((i) => i.record.moduleId === 'deck')
			.map((i) => ({ id: i.record.id, title: i.record.title || `Deck ${i.record.id.slice(0, 4)}` }))
	);

	$effect(() => {
		const [gainA, gainB] = applyCurve(position, curve);
		if (leftDeckId) eventBus.emit(`${leftDeckId}:setVolume`, gainA);
		if (rightDeckId) eventBus.emit(`${rightDeckId}:setVolume`, gainB);
	});

	function startCrossfade() {
		if (isAnimating) return;
		const from = position;
		const to = position <= 0 ? 1 : -1;
		const start = performance.now();
		isAnimating = true;

		const tick = (now: number) => {
			const progress = Math.min((now - start) / (fadeDurationSec * 1000), 1);
			position = from + (to - from) * progress;
			if (progress < 1) {
				animRaf = requestAnimationFrame(tick);
			} else {
				isAnimating = false;
				animRaf = null;
			}
		};
		animRaf = requestAnimationFrame(tick);
	}

	function cancelAnimation() {
		if (animRaf) {
			cancelAnimationFrame(animRaf);
			animRaf = null;
			isAnimating = false;
		}
	}

	onDestroy(() => {
		cancelAnimation();
	});
</script>

<div class="flex h-full flex-col gap-3 p-3">
	<!-- Deck selectors -->
	<div class="grid grid-cols-2 gap-2 text-xs">
		<div>
			<label class="mb-1 block text-primary-400" for="cf-left-{instanceId}">Deck A (Left)</label>
			<select
				id="cf-left-{instanceId}"
				bind:value={leftDeckId}
				class="w-full rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
			>
				<option value="">-- None --</option>
				{#each decks as d (d.id)}<option value={d.id}>{d.title}</option>{/each}
			</select>
		</div>
		<div>
			<label class="mb-1 block text-primary-400" for="cf-right-{instanceId}">Deck B (Right)</label>
			<select
				id="cf-right-{instanceId}"
				bind:value={rightDeckId}
				class="w-full rounded border border-primary-700 bg-primary-800 px-2 py-1 text-primary-100"
			>
				<option value="">-- None --</option>
				{#each decks as d (d.id)}<option value={d.id}>{d.title}</option>{/each}
			</select>
		</div>
	</div>

	<!-- Curve selector -->
	<div class="flex gap-2">
		{#each ['linear', 'equal-power', 'cut'] as c (c)}
			<button
				class="flex-1 rounded py-1 text-xs transition-colors"
				class:bg-secondary-700={curve === c}
				class:bg-primary-800={curve !== c}
				onclick={() => (curve = c as CurveType)}>{c}</button
			>
		{/each}
	</div>

	<!-- Crossfader slider -->
	<div class="flex items-center gap-2 text-xs text-primary-400">
		<span>A</span>
		<input
			type="range"
			min="-1"
			max="1"
			step="0.01"
			bind:value={position}
			class="flex-1 accent-secondary-500"
		/>
		<span>B</span>
	</div>

	<!-- Controls -->
	<div class="flex items-center gap-2">
		<button
			class="flex-1 rounded bg-secondary-700 py-1.5 text-sm transition-colors hover:bg-secondary-600"
			onclick={isAnimating ? cancelAnimation : startCrossfade}
		>
			{isAnimating ? 'Cancel' : 'Crossfade Now'}
		</button>
		<label for="cf-dur-{instanceId}" class="sr-only">Fade duration</label>
		<input
			id="cf-dur-{instanceId}"
			type="number"
			min="1"
			max="30"
			step="0.5"
			bind:value={fadeDurationSec}
			class="w-16 rounded border border-primary-700 bg-primary-800 px-2 py-1 text-xs text-primary-100"
			title="Fade duration (s)"
		/>
		<span class="text-xs text-primary-400">s</span>
	</div>
</div>
