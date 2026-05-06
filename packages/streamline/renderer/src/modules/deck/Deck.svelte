<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createDeckAudio } from './deck-audio';
	import DbMeter from './DbMeter.svelte';
	import WaveformDisplay from './WaveformDisplay.svelte';
	import type { Song } from '@streamline/shared';
	import { eventBus } from '../event-bus';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	const audio = createDeckAudio();

	let song = $state<Song | null>(null);
	let isPlaying = $state(false);
	let position = $state(0);
	let duration = $state(0);
	let volume = $state(1.0);
	let peaks = $state<number[] | null>(null);

	let positionRaf: number;
	let worker: Worker | null = null;
	let unsubVolume: (() => void) | null = null;

	onMount(() => {
		audio.onEnded(() => {
			isPlaying = false;
		});
		const trackPosition = () => {
			position = audio.getPosition();
			duration = audio.getDuration();
			positionRaf = requestAnimationFrame(trackPosition);
		};
		positionRaf = requestAnimationFrame(trackPosition);
		worker = new Worker(new URL('./waveform-worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = async (e: MessageEvent<{ peaks: number[] | null; hash: string }>) => {
			if (e.data.peaks) {
				peaks = e.data.peaks;
				await window.streamline.api.library.saveWaveform(e.data.hash, e.data.peaks);
			}
		};
		unsubVolume = eventBus.on(`${instanceId}:setVolume`, (payload) => {
			updateVolume(payload as number);
		});
	});

	onDestroy(() => {
		cancelAnimationFrame(positionRaf);
		audio.destroy();
		worker?.terminate();
		unsubVolume?.();
	});

	async function loadSong(path: string) {
		const arrayBuffer = await window.streamline.api.library.readAudioFile(path);
		const workerBuffer = arrayBuffer.slice(0);
		await audio.load(arrayBuffer);
		duration = audio.getDuration();
		position = 0;
		isPlaying = false;
		peaks = null;

		const hash = await computeHash(path);
		const cached = await window.streamline.api.library.loadWaveform(hash);
		if (cached) {
			peaks = cached;
		} else {
			worker?.postMessage({ arrayBuffer: workerBuffer, hash, pixelWidth: 600 }, [workerBuffer]);
		}
	}

	async function computeHash(path: string): Promise<string> {
		const data = new TextEncoder().encode(path);
		const hashBuf = await crypto.subtle.digest('SHA-256', data);
		return Array.from(new Uint8Array(hashBuf))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
			.slice(0, 16);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files[0];
		if (file) loadSong(window.streamline.getPathForFile(file));
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function togglePlay() {
		if (isPlaying) {
			audio.pause();
			isPlaying = false;
		} else {
			audio.play();
			isPlaying = true;
		}
	}

	function seek(seconds: number) {
		audio.seek(seconds);
	}

	function updateVolume(v: number) {
		volume = v;
		audio.setVolume(v);
	}

	function fadeOut() {
		audio.fadeOut(5000);
	}

	const formatTime = (s: number) => {
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m}:${sec.toString().padStart(2, '0')}`;
	};
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex h-full flex-col gap-2 bg-primary-900 p-3 text-primary-100 select-none"
	ondrop={handleDrop}
	ondragover={handleDragOver}
>
	<!-- Track info -->
	<div class="flex min-h-12 items-center gap-2">
		{#if song?.artworkPath}
			<img src={song.artworkPath} alt="cover" class="h-12 w-12 rounded object-cover" />
		{:else}
			<div
				class="flex h-12 w-12 items-center justify-center rounded bg-primary-800 text-2xl text-primary-500"
			>
				♫
			</div>
		{/if}
		<div class="flex-1 overflow-hidden">
			<div class="truncate text-sm font-semibold">{song?.title ?? 'Drop a file here'}</div>
			<div class="truncate text-xs text-primary-400">{song?.artist ?? ''}</div>
		</div>
		<!-- dB Meter -->
		<div class="h-12 w-6">
			<DbMeter analyser={audio.analyserNode} />
		</div>
	</div>

	<!-- Waveform / seekbar -->
	<div class="h-16 flex-shrink-0">
		<WaveformDisplay {peaks} {position} {duration} onSeek={seek} />
	</div>

	<!-- Time display -->
	<div class="flex justify-between font-mono text-xs text-primary-400">
		<span>{formatTime(position)}</span>
		<span>-{formatTime(Math.max(0, duration - position))}</span>
	</div>

	<!-- Controls -->
	<div class="flex items-center gap-2">
		<button
			class="rounded px-4 py-1.5 text-sm font-medium transition-colors"
			class:bg-success-600={isPlaying}
			class:hover:bg-success-500={isPlaying}
			class:bg-primary-700={!isPlaying}
			class:hover:bg-primary-600={!isPlaying}
			onclick={togglePlay}
		>
			{isPlaying ? '⏸ Pause' : '▶ Play'}
		</button>
		<button
			class="rounded bg-primary-700 px-3 py-1.5 text-sm transition-colors hover:bg-primary-600"
			onclick={fadeOut}>Fade Out</button
		>
		<label for="deck-vol-{instanceId}" class="sr-only">Volume</label>
		<input
			id="deck-vol-{instanceId}"
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={volume}
			oninput={(e) => updateVolume(parseFloat((e.target as HTMLInputElement).value))}
			class="flex-1 accent-secondary-500"
		/>
	</div>
</div>
