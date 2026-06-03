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

		const midY = height / 2;
		const playedRatio = dur > 0 ? pos / dur : 0;
		const barWidth = Math.max(1, width / peakData.length - 0.5);

		for (let i = 0; i < peakData.length; i++) {
			const x = (i / peakData.length) * width;
			const barHeight = peakData[i] * height * 0.88;
			const isPlayed = i / peakData.length < playedRatio;

			canvasCtx.fillStyle = isPlayed ? 'rgba(91, 192, 185, 0.88)' : 'rgba(40, 65, 76, 0.72)';
			canvasCtx.fillRect(x, midY - barHeight / 2, barWidth, barHeight);
		}

		const playheadX = playedRatio * width;
		canvasCtx.save();
		canvasCtx.shadowColor = 'rgba(255, 255, 255, 0.55)';
		canvasCtx.shadowBlur = 7;
		canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
		canvasCtx.lineWidth = 1.5;
		canvasCtx.beginPath();
		canvasCtx.moveTo(playheadX, 0);
		canvasCtx.lineTo(playheadX, height);
		canvasCtx.stroke();
		canvasCtx.restore();
	}

	function handleCanvasClick(e: MouseEvent) {
		if (!canvas || duration === 0) return;
		const rect = canvas.getBoundingClientRect();
		onSeek(((e.clientX - rect.left) / rect.width) * duration);
	}

	function handleSeekBarClick(e: MouseEvent) {
		/* v8 ignore next 1 — early return when duration is zero not triggered in tests */
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
			class="block h-full w-full cursor-pointer"
			onclick={handleCanvasClick}
		></canvas>
	{:else if songLoaded}
		<div
			class="relative h-full w-full cursor-pointer overflow-hidden rounded bg-primary-800"
			onclick={handleSeekBarClick}
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
				class="absolute inset-y-0 left-0 bg-secondary-900 opacity-60"
				style="width:{duration > 0 ? (position / duration) * 100 : 0}%"
			></div>
			<div class="absolute inset-0 flex items-center justify-center text-xs text-primary-500">
				Loading waveform…
			</div>
		</div>
	{:else}
		<div
			class="flex h-full items-center justify-center rounded border border-dashed border-primary-700 bg-primary-900 text-xs text-primary-600"
		>
			Drop a file to load
		</div>
	{/if}
</div>
