<script lang="ts">
	interface Props {
		peaks: number[] | null;
		position: number;
		duration: number;
		onSeek: (seconds: number) => void;
	}
	const { peaks, position, duration, onSeek }: Props = $props();

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let width = $state(0);
	let height = $state(0);

	$effect(() => {
		if (!canvas || !peaks) return;
		drawWaveform(peaks, position, duration);
	});

	function drawWaveform(peakData: number[], pos: number, dur: number) {
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;
		ctx.clearRect(0, 0, width, height);

		const mid = height / 2;
		const playedX = dur > 0 ? (pos / dur) * width : 0;

		for (let i = 0; i < peakData.length; i++) {
			const x = (i / peakData.length) * width;
			const h = peakData[i] * height;
			ctx.fillStyle =
				i < (pos / dur) * peakData.length ? 'rgba(91, 192, 185, 0.9)' : 'rgba(91, 192, 185, 0.35)';
			ctx.fillRect(x, mid - h / 2, Math.max(1, width / peakData.length - 0.5), h);
		}

		// Playhead
		ctx.strokeStyle = '#fff';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(playedX, 0);
		ctx.lineTo(playedX, height);
		ctx.stroke();
	}

	function handleClick(e: MouseEvent) {
		if (!canvas || duration === 0) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		onSeek((x / rect.width) * duration);
	}
</script>

<div class="relative h-full w-full" bind:clientWidth={width} bind:clientHeight={height}>
	{#if peaks}
		<canvas
			bind:this={canvas}
			{width}
			{height}
			class="h-full w-full cursor-pointer"
			onclick={handleClick}
		></canvas>
	{:else}
		<div class="flex h-full items-center justify-center text-xs text-primary-500">
			Loading waveform…
		</div>
	{/if}
</div>
