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
		const canvasCtx = canvas.getContext('2d')!;
		canvasCtx.clearRect(0, 0, width, height);

		const mid = height / 2;
		const playedX = dur > 0 ? (pos / dur) * width : 0;

		for (let i = 0; i < peakData.length; i++) {
			const x = (i / peakData.length) * width;
			const h = peakData[i] * height;
			canvasCtx.fillStyle =
				i < (pos / dur) * peakData.length ? 'rgba(91, 192, 185, 0.9)' : 'rgba(91, 192, 185, 0.35)';
			canvasCtx.fillRect(x, mid - h / 2, Math.max(1, width / peakData.length - 0.5), h);
		}

		// Playhead
		canvasCtx.strokeStyle = '#fff';
		canvasCtx.lineWidth = 2;
		canvasCtx.beginPath();
		canvasCtx.moveTo(playedX, 0);
		canvasCtx.lineTo(playedX, height);
		canvasCtx.stroke();
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
