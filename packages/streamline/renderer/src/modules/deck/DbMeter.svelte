<script lang="ts">
	import { onDestroy } from 'svelte';

	interface Props {
		analyser: AnalyserNode;
	}
	const { analyser }: Props = $props();

	let dbfs = $state(-60);
	let peak = $state(-60);
	let peakHoldTime = 0;
	let rafId: number;

	const PEAK_HOLD_MS = 2000;
	const PEAK_DECAY_DB_PER_S = 10;

	const timeDomainData = $derived(new Float32Array(analyser.fftSize));

	function tick(now: number) {
		analyser.getFloatTimeDomainData(timeDomainData);
		let sum = 0;
		for (let i = 0; i < timeDomainData.length; i++) {
			sum += timeDomainData[i] * timeDomainData[i];
		}
		const rms = Math.sqrt(sum / timeDomainData.length);
		dbfs = rms > 0 ? Math.max(-60, 20 * Math.log10(rms)) : -60;

		if (dbfs >= peak) {
			peak = dbfs;
			peakHoldTime = now;
		} else if (now - peakHoldTime > PEAK_HOLD_MS) {
			peak = Math.max(-60, peak - PEAK_DECAY_DB_PER_S / 60);
		}

		rafId = requestAnimationFrame(tick);
	}

	rafId = requestAnimationFrame(tick);
	onDestroy(() => cancelAnimationFrame(rafId));

	const toPercent = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
	const isClipping = $derived(peak >= -0.1);
</script>

<div class="flex h-full w-6 items-end gap-0.5">
	<!-- RMS bar -->
	<div class="relative flex-1 overflow-hidden rounded-sm bg-primary-800">
		<div
			class="absolute right-0 bottom-0 left-0 transition-none"
			class:bg-success-500={dbfs < -6}
			class:bg-warning-500={dbfs >= -6 && dbfs < -0.1}
			class:bg-danger-500={dbfs >= -0.1}
			style="height: {toPercent(dbfs)}%"
		></div>
	</div>
	<!-- Peak indicator -->
	<div
		class="h-1 w-1 rounded-full"
		class:bg-danger-500={isClipping}
		class:bg-primary-400={!isClipping}
		style="margin-bottom: {toPercent(peak)}%"
	></div>
</div>
