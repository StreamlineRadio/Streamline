<script lang="ts">
	import { onDestroy, untrack } from 'svelte';

	interface Props {
		analyser: AnalyserNode;
	}
	const { analyser }: Props = $props();

	let dbfs = $state(-60);
	let peak = $state(-60);
	let peakHoldTime = 0;
	let animationFrameId: number;

	const PEAK_HOLD_MS = 2000;
	const PEAK_DECAY_DB_PER_S = 10;

	const timeDomainData = new Float32Array(untrack(() => analyser.fftSize));
	let lastTickMs = 0;

	function tick(now: number) {
		analyser.getFloatTimeDomainData(timeDomainData);
		let sum = 0;
		for (let i = 0; i < timeDomainData.length; i++) {
			sum += timeDomainData[i] * timeDomainData[i];
		}
		const rmsLevel = Math.sqrt(sum / timeDomainData.length);
		dbfs = rmsLevel > 0 ? Math.max(-60, 20 * Math.log10(rmsLevel)) : -60;

		const dt = lastTickMs === 0 ? 1 / 60 : (now - lastTickMs) / 1000;
		lastTickMs = now;

		if (dbfs >= peak) {
			peak = dbfs;
			peakHoldTime = now;
		} else if (now - peakHoldTime > PEAK_HOLD_MS) {
			peak = Math.max(-60, peak - PEAK_DECAY_DB_PER_S * dt);
		}

		animationFrameId = requestAnimationFrame(tick);
	}

	animationFrameId = requestAnimationFrame(tick);
	onDestroy(() => cancelAnimationFrame(animationFrameId));

	const toPercent = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
	const isClipping = $derived(peak >= -0.1);
</script>

<div class="relative h-full w-full overflow-hidden rounded-sm">
	<div class="absolute inset-0 bg-primary-800"></div>
	<div
		class="meter-fill absolute inset-0"
		style="clip-path: inset({100 - toPercent(dbfs)}% 0 0 0)"
	></div>
	<div class="meter-segments pointer-events-none absolute inset-0"></div>
	<div
		class="absolute right-0 left-0 h-0.5 rounded-sm"
		class:bg-primary-300={!isClipping}
		class:peak-clipping={isClipping}
		style="bottom: calc({toPercent(peak)}% - 1px)"
	></div>
</div>

<style>
	.meter-fill {
		background: linear-gradient(
			to top,
			var(--color-success-600) 0%,
			var(--color-success-400) 62%,
			var(--color-warning-500) 80%,
			var(--color-danger-500) 94%
		);
	}

	.meter-segments {
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0px,
			transparent 3px,
			var(--color-primary-950) 3px,
			var(--color-primary-950) 4px
		);
	}

	.peak-clipping {
		background: var(--color-danger-400);
		box-shadow: 0 0 4px var(--color-danger-500);
	}
</style>
