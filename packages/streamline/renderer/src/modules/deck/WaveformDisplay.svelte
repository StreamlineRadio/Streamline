<script lang="ts">
	interface Props {
		peaks: number[] | null;
		position: number;
		duration: number;
		songLoaded: boolean;
		onSeek: (seconds: number) => void;
	}
	const { peaks, position, duration, songLoaded, onSeek }: Props = $props();

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

	function handleBarClick(e: MouseEvent) {
		if (duration === 0) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		onSeek(((e.clientX - rect.left) / rect.width) * duration);
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
	{:else if songLoaded}
		<div
			class="relative h-full w-full cursor-pointer rounded bg-primary-800"
			onclick={handleBarClick}
			onkeydown={(e) => {
				if (e.key === 'ArrowLeft') onSeek(Math.max(0, position - 5));
				if (e.key === 'ArrowRight') onSeek(Math.min(duration, position + 5));
			}}
			role="slider"
			aria-label="Seek"
			aria-valuemin={0}
			aria-valuemax={duration}
			aria-valuenow={position}
			tabindex="0"
		>
			<div
				class="absolute inset-y-0 left-0 rounded bg-secondary-900 opacity-60"
				style="width:{duration > 0 ? (position / duration) * 100 : 0}%"
			></div>
			<div class="absolute inset-0 flex items-center justify-center text-xs text-primary-500">
				Loading waveform…
			</div>
		</div>
	{:else}
		<div class="flex h-full items-center justify-center text-xs text-primary-500">
			Drop a file to load
		</div>
	{/if}
</div>
