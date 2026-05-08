<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createDeckAudio } from './deck-audio';
	import DbMeter from './DbMeter.svelte';
	import WaveformDisplay from './WaveformDisplay.svelte';
	import type { Song } from '@streamline/shared';
	import { eventBus } from '../event-bus';
	import { instanceStore } from '../instance-store.svelte';
	import { layoutStore } from '../../layout/store.svelte';
	import logoUrl from '../../assets/favicon.svg?url';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	interface DeckSettings {
		sendMetadata: boolean;
		acceptsFromQueueId: string | null;
	}

	const defaultSettings: DeckSettings = { sendMetadata: true, acceptsFromQueueId: null };

	let showSettings = $state(false);

	const currentSettings = $derived(
		(() => {
			const record = instanceStore.get(instanceId)?.record;
			if (!record?.settingsJson) return defaultSettings;
			try {
				return JSON.parse(record.settingsJson) as DeckSettings;
			} catch {
				return defaultSettings;
			}
		})()
	);

	function updateSettings(patch: Partial<DeckSettings>) {
		const next = { ...currentSettings, ...patch };
		const json = JSON.stringify(next);
		instanceStore.update(instanceId, { settingsJson: json });
		layoutStore.updateInstance(instanceId, { settingsJson: json });
	}

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
		const filename = path.split('/').pop() ?? path;
		song = {
			id: '',
			path,
			title: filename,
			artist: null,
			album: null,
			durationSec: null,
			sampleRate: null,
			channels: null,
			bitrateKbps: null,
			codec: null,
			artworkPath: null,
			waveformPath: null,
			fileSize: null,
			fileMtime: null,
			addedAt: Date.now(),
			lastPlayedAt: null,
			playCount: 0,
			missing: false
		};

		const arrayBuffer = await window.streamline.api.library.readAudioFile(path);
		const workerBuffer = arrayBuffer.slice(0);
		await audio.load(arrayBuffer);
		duration = audio.getDuration();
		position = 0;
		isPlaying = false;
		peaks = null;

		window.streamline.api.library.search(filename).then((results: Song[]) => {
			const match = results.find((result) => result.path === path);
			if (match) song = match;
		});

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
			<img src={logoUrl} alt="Streamline" class="h-12 w-12 rounded object-contain p-1 opacity-40" />
		{/if}
		<div class="flex-1 overflow-hidden">
			<div class="truncate text-sm font-semibold">{song?.title ?? 'Drop a file here'}</div>
			<div class="truncate text-xs text-primary-400">{song?.artist ?? ''}</div>
		</div>
		<!-- dB Meter -->
		<div class="h-12 w-6">
			<DbMeter analyser={audio.analyserNode} />
		</div>
		<button
			class="px-1 text-primary-500 hover:text-primary-300"
			onclick={() => (showSettings = !showSettings)}
			title="Deck settings">⚙</button
		>
	</div>

	<!-- Settings panel -->
	{#if showSettings}
		<div class="flex flex-col gap-2 rounded bg-primary-800 p-2 text-xs">
			<label class="flex cursor-pointer items-center gap-2">
				<input
					type="checkbox"
					checked={currentSettings.sendMetadata}
					onchange={(e) => updateSettings({ sendMetadata: (e.target as HTMLInputElement).checked })}
					class="accent-secondary-500"
				/>
				Send metadata
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-primary-400">Queue ID</span>
				<input
					type="text"
					value={currentSettings.acceptsFromQueueId ?? ''}
					oninput={(e) => {
						const value = (e.target as HTMLInputElement).value.trim();
						updateSettings({ acceptsFromQueueId: value || null });
					}}
					placeholder="none"
					class="rounded bg-primary-700 px-2 py-1 text-primary-100 outline-none focus:ring-1 focus:ring-secondary-500"
				/>
			</label>
		</div>
	{/if}

	<!-- Waveform / seekbar -->
	<div class="h-16 flex-shrink-0">
		<WaveformDisplay {peaks} {position} {duration} songLoaded={song !== null} onSeek={seek} />
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
			class:bg-primary-700={!isPlaying && song !== null}
			class:hover:bg-primary-600={!isPlaying && song !== null}
			class:bg-primary-800={song === null}
			class:opacity-40={song === null}
			class:cursor-not-allowed={song === null}
			disabled={song === null}
			onclick={togglePlay}
		>
			{isPlaying ? '⏸ Pause' : '▶ Play'}
		</button>
		<button
			class="rounded bg-primary-700 px-3 py-1.5 text-sm transition-colors"
			class:hover:bg-primary-600={song !== null}
			class:opacity-40={song === null}
			class:cursor-not-allowed={song === null}
			disabled={song === null}
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
