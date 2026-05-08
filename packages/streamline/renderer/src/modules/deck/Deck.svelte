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
	import { getSongDragData } from '../../drag-drop/song-drag';

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
	let artworkDataUrl = $state<string | null>(null);
	let isPlaying = $state(false);
	let position = $state(0);
	let duration = $state(0);
	let volume = $state(1.0);
	let peaks = $state<number[] | null>(null);

	let positionRaf: number;
	let deckStateTimer: ReturnType<typeof setInterval>;
	let unsubVolume: (() => void) | null = null;
	let unsubLoad: (() => void) | null = null;
	let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
	let loadGeneration = 0;

	function emitDeckRemaining() {
		const queueId = currentSettings.acceptsFromQueueId;
		if (!queueId) return;
		const dur = audio.getDuration();
		const pos = audio.getPosition();
		const remaining = dur > 0 ? Math.max(0, dur - pos) : 0;
		eventBus.emit(`queue:${queueId}:deck-remaining`, { deckId: instanceId, remaining });
	}

	// Notify old queue when acceptsFromQueueId changes mid-session
	$effect(() => {
		const queueId = currentSettings.acceptsFromQueueId;
		return () => {
			if (queueId) {
				eventBus.emit(`queue:${queueId}:deck-remaining`, {
					deckId: instanceId,
					remaining: 0
				});
			}
		};
	});

	onMount(() => {
		audio.onEnded(() => {
			const queueId = currentSettings.acceptsFromQueueId;
			unload();
			if (queueId) {
				eventBus.emit(`queue:${queueId}:request-next`, instanceId);
			}
		});

		unsubLoad = eventBus.on(`deck:${instanceId}:load-song`, async (path) => {
			await loadSong(path as string);
			audio.play();
			isPlaying = true;
		});

		const trackPosition = () => {
			position = audio.getPosition();
			duration = audio.getDuration();
			positionRaf = requestAnimationFrame(trackPosition);
		};
		positionRaf = requestAnimationFrame(trackPosition);

		// Emit remaining time to connected queue every second for live ETA
		deckStateTimer = setInterval(emitDeckRemaining, 1000);

		unsubVolume = eventBus.on(`${instanceId}:setVolume`, (payload) => {
			updateVolume(payload as number);
		});
	});

	onDestroy(() => {
		cancelAnimationFrame(positionRaf);
		clearInterval(deckStateTimer);
		if (fadeOutTimer !== null) clearTimeout(fadeOutTimer);
		audio.destroy();
		unsubVolume?.();
		unsubLoad?.();
		// Signal queue that this deck is gone
		const queueId = currentSettings.acceptsFromQueueId;
		if (queueId) {
			eventBus.emit(`queue:${queueId}:deck-remaining`, { deckId: instanceId, remaining: 0 });
		}
	});

	function unload() {
		if (fadeOutTimer !== null) {
			clearTimeout(fadeOutTimer);
			fadeOutTimer = null;
		}
		audio.stop();
		song = null;
		artworkDataUrl = null;
		peaks = null;
		position = 0;
		duration = 0;
		isPlaying = false;
	}

	async function loadSong(path: string) {
		const generation = ++loadGeneration;
		const filename = path.split('/').pop() ?? path;
		artworkDataUrl = null;
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
		await audio.load(arrayBuffer);
		duration = audio.getDuration();
		position = 0;
		isPlaying = false;
		peaks = null;

		window.streamline.api.library.getCoverArt(path).then((dataUrl) => {
			if (generation !== loadGeneration) return;
			artworkDataUrl = dataUrl;
		});

		window.streamline.api.library.getSongByPath(path).then(async (match) => {
			if (generation !== loadGeneration) return;
			if (match) {
				song = match;
			} else {
				const meta = await window.streamline.api.library.getFileMetadata(path);
				if (generation !== loadGeneration) return;
				if (meta) song = meta;
			}
		});

		const hash = await computeHash(path);
		const cached = await window.streamline.api.library.loadWaveform(hash);
		if (cached) {
			peaks = cached;
		} else {
			requestIdleCallback(() => {
				const computedPeaks = audio.getPeaks(600);
				if (computedPeaks.length > 0) {
					peaks = computedPeaks;
					window.streamline.api.library.saveWaveform(hash, computedPeaks);
				}
			});
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

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		const droppedSong = getSongDragData(e);
		if (droppedSong) {
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
			await loadSong(droppedSong.path);
			return;
		}
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
		audio.fadeOut(3000);
		if (fadeOutTimer !== null) clearTimeout(fadeOutTimer);
		fadeOutTimer = setTimeout(unload, 3500);
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
		{#if artworkDataUrl}
			<img src={artworkDataUrl} alt="cover" class="h-12 w-12 rounded object-cover" />
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
		{#if song !== null}
			<button
				class="px-1 text-primary-500 hover:text-danger-400"
				onclick={unload}
				title="Unload song">✕</button
			>
		{/if}
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
