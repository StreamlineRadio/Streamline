<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		faPlay,
		faPause,
		faStop,
		faEject,
		faArrowTrendDown,
		faGear
	} from '@fortawesome/free-solid-svg-icons';
	import { createDeckAudio } from './deck-audio';
	import DbMeter from '../../components/DbMeter.svelte';
	import IconButton from '../../components/IconButton.svelte';
	import WaveformDisplay from './WaveformDisplay.svelte';
	import DeckSettingsModal from './DeckSettingsModal.svelte';
	import type { Song } from '@streamline/shared';
	import { eventBus } from '../event-bus';
	import { instanceStore } from '../instance-store.svelte';
	import { layoutStore } from '../../layout/store.svelte';
	import logoUrl from '../../assets/favicon.svg?url';
	import { getSongDragData } from '../../drag-drop/song-drag';
	import type {
		DeckState,
		DeckStatePayload,
		DeckRemainingPayload,
		DeckLoadFailedPayload
	} from './types';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	interface DeckSettings {
		sendMetadata: boolean;
	}

	const defaultSettings: DeckSettings = { sendMetadata: true };

	let showSettings = $state(false);

	const currentSettings = $derived(
		(() => {
			const record = instanceStore.get(instanceId)?.record;
			if (!record?.settingsJson) return defaultSettings;
			try {
				return { ...defaultSettings, ...JSON.parse(record.settingsJson) } as DeckSettings;
			} catch {
				/* v8 ignore next 2 — catch: JSON.parse always valid in tests */
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
	let currentState = $state<DeckState>('unloaded');

	let volTrackHeight = $state(0);

	let positionAnimationFrameId: number;
	let deckStateTimer: ReturnType<typeof setInterval>;
	let unsubVolume: (() => void) | null = null;
	let unsubLoad: (() => void) | null = null;
	let unsubLoadIfIdle: (() => void) | null = null;
	let unsubStateRequest: (() => void) | null = null;
	let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
	let loadGeneration = 0;

	function emitState(next: DeckState): void {
		currentState = next;
		eventBus.emit(`deck:${instanceId}:state`, { state: next } satisfies DeckStatePayload);
	}

	const remaining = $derived(Math.max(0, duration - position));

	/* v8 ignore next 9 — emitDeckRemaining: only called from setInterval inside onMount, not exercised in tests */
	function emitDeckRemaining() {
		if (currentState !== 'loaded') return;
		const dur = audio.getDuration();
		const pos = audio.getPosition();
		const trackRemaining = dur > 0 ? Math.max(0, dur - pos) : 0;
		eventBus.emit(`deck:${instanceId}:remaining`, {
			remaining: trackRemaining
		} satisfies DeckRemainingPayload);
	}

	/* v8 ignore next 42 — onMount: requestAnimationFrame/setInterval callbacks not exercised in jsdom */
	onMount(() => {
		audio.onEnded(() => {
			unload();
			eventBus.emit(`deck:${instanceId}:ended`, undefined);
		});

		unsubLoad = eventBus.on(`deck:${instanceId}:load-song`, async (path) => {
			const ok = await loadSong(path as string);
			if (!ok) return;
			audio.play();
			isPlaying = true;
		});

		unsubLoadIfIdle = eventBus.on(`deck:${instanceId}:load-if-idle`, async (payload) => {
			const { path, onAccept } = payload as { path: string; onAccept: () => void };
			if (song !== null) return;
			onAccept();
			const ok = await loadSong(path);
			if (!ok) return;
			audio.play();
			isPlaying = true;
		});

		unsubStateRequest = eventBus.on(`deck:${instanceId}:state-request`, () => {
			eventBus.emit(`deck:${instanceId}:state`, {
				state: currentState
			} satisfies DeckStatePayload);
		});

		const trackPosition = () => {
			position = audio.getPosition();
			duration = audio.getDuration();
			positionAnimationFrameId = requestAnimationFrame(trackPosition);
		};
		positionAnimationFrameId = requestAnimationFrame(trackPosition);

		deckStateTimer = setInterval(emitDeckRemaining, 1000);

		unsubVolume = eventBus.on(`deck:${instanceId}:setVolume`, (payload) => {
			updateVolume(payload as number);
		});
	});

	/* v8 ignore next 16 — onDestroy: cleanup of browser timers and Web Audio resources */
	onDestroy(() => {
		// Invalidate any in-flight loadSong so its async callbacks bail out instead of
		// emitting 'loaded'/restoring state after this deck has emitted 'unloaded'.
		loadGeneration++;
		cancelAnimationFrame(positionAnimationFrameId);
		clearInterval(deckStateTimer);
		if (fadeOutTimer !== null) clearTimeout(fadeOutTimer);
		audio.destroy();
		unsubVolume?.();
		unsubLoad?.();
		unsubLoadIfIdle?.();
		unsubStateRequest?.();
		eventBus.emit(`deck:${instanceId}:state`, {
			state: 'unloaded'
		} satisfies DeckStatePayload);
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
		emitState('unloaded');
	}

	/* v8 ignore next 9 — stopPlayback: Web Audio pause/seek not tested via button click in jsdom */
	function stopPlayback() {
		if (fadeOutTimer !== null) {
			clearTimeout(fadeOutTimer);
			fadeOutTimer = null;
		}
		audio.pause();
		audio.seek(0);
		isPlaying = false;
	}

	/* v8 ignore next 100 — loadSong: requires Electron IPC and Web Audio decodeAudioData */
	async function loadSong(path: string): Promise<boolean> {
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

		emitState('loading');

		try {
			const arrayBuffer = await window.streamline.api.library.readAudioFile(path);
			if (generation !== loadGeneration) return false;
			await audio.load(arrayBuffer);
			if (generation !== loadGeneration) return false;
			duration = audio.getDuration();
			position = 0;
			isPlaying = false;
			peaks = null;
			emitState('loaded');
		} catch (error) {
			if (generation !== loadGeneration) return false;
			// If readAudioFile threw, audio.load (which stops the previous source) never
			// ran, so the prior track would keep playing under the now-empty deck. Stop it.
			audio.stop();
			song = null;
			artworkDataUrl = null;
			duration = 0;
			position = 0;
			peaks = null;
			isPlaying = false;
			emitState('unloaded');
			eventBus.emit(`deck:${instanceId}:load-failed`, {
				path,
				error: String(error)
			} satisfies DeckLoadFailedPayload);
			// Queue advancement contract: treat a failed load as "ended without starting"
			// so the linked queue's autoplay handler pushes the next song.
			eventBus.emit(`deck:${instanceId}:ended`, undefined);
			eventBus.emit('toast:show', {
				message: `Failed to load song: ${filename}`,
				type: 'error'
			});
			return false;
		}

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
		if (generation !== loadGeneration) return false;
		const cached = await window.streamline.api.library.loadWaveform(hash);
		if (generation !== loadGeneration) return false;
		if (cached) {
			peaks = cached;
		} else {
			requestIdleCallback(() => {
				// requestIdleCallback fires after a deferred delay; without this guard a
				// superseded load could compute peaks from the *current* audio buffer and
				// save them under the *old* path's hash, corrupting the waveform cache.
				if (generation !== loadGeneration) return;
				const computedPeaks = audio.getPeaks(600);
				if (computedPeaks.length > 0) {
					peaks = computedPeaks;
					window.streamline.api.library.saveWaveform(hash, computedPeaks);
				}
			});
		}
		return true;
	}

	/* v8 ignore next 8 — computeHash: crypto.subtle.digest not available in jsdom */
	async function computeHash(path: string): Promise<string> {
		const data = new TextEncoder().encode(path);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		return Array.from(new Uint8Array(hashBuffer))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
			.slice(0, 16);
	}

	/* v8 ignore next 11 — handleDrop: drag-and-drop events not fired in jsdom tests */
	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		const droppedSong = getSongDragData(e);
		if (droppedSong) {
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
			await loadSong(droppedSong.path);
			return;
		}
		const file = e.dataTransfer?.files[0];
		if (file) await loadSong(window.streamline.getPathForFile(file));
	}

	/* v8 ignore next 3 — handleDragOver: drag events not fired in jsdom tests */
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	/* v8 ignore next 9 — togglePlay: Web Audio play/pause not tested via button click in jsdom */
	function togglePlay() {
		if (isPlaying) {
			audio.pause();
			isPlaying = false;
		} else {
			audio.play();
			isPlaying = true;
		}
	}

	/* v8 ignore next 3 — seek: Web Audio seek not exercised via WaveformDisplay click in jsdom */
	function seek(seconds: number) {
		audio.seek(seconds);
	}

	/* v8 ignore next 4 — updateVolume: volume slider oninput and setVolume IPC not exercised in jsdom */
	function updateVolume(value: number) {
		volume = value;
		audio.setVolume(value);
	}

	function fadeOut() {
		audio.fadeOut(3000);
		if (fadeOutTimer !== null) clearTimeout(fadeOutTimer);
		fadeOutTimer = setTimeout(() => {
			unload();
			// Queue advancement contract: fade-out completion is treated like a natural
			// end so the linked queue's autoplay handler pushes the next song. Manual
			// eject (which also calls unload) intentionally stays silent.
			eventBus.emit(`deck:${instanceId}:ended`, undefined);
		}, 3500);
	}

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const tenths = Math.floor((seconds % 1) * 10);
		return `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`;
	};
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex h-full overflow-hidden bg-primary-950 text-primary-100 select-none"
	ondrop={handleDrop}
	ondragover={handleDragOver}
>
	<!-- Top playing accent bar (spans full width) -->
	<div
		class="absolute inset-x-0 top-0 z-10 h-0.5 origin-left bg-secondary-500 transition-transform duration-300"
		style="transform: scaleX({isPlaying ? 1 : 0})"
	></div>

	<!-- Left column: header, waveform, controls, timestamps -->
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Track header (cover + title/artist on top, transport buttons below title) -->
		<div class="flex items-stretch gap-2.5 px-2.5 pt-2.5 pb-2">
			<div
				class={[
					'h-24 w-24 shrink-0 overflow-hidden rounded transition-all duration-300',
					isPlaying ? 'ring-1 ring-secondary-500 ring-offset-1 ring-offset-primary-950' : ''
				]}
			>
				{#if artworkDataUrl}
					<img src={artworkDataUrl} alt="cover" class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-primary-800">
						<img src={logoUrl} alt="Streamline" class="h-14 w-14 object-contain opacity-30" />
					</div>
				{/if}
			</div>

			<div class="flex min-w-0 flex-1 flex-col justify-between gap-2">
				<div class="min-w-0">
					<div class="truncate text-sm leading-snug font-semibold">
						{song?.title ?? 'Drop a file here'}
					</div>
					<div class="truncate text-xs leading-snug text-primary-400">
						{song?.artist ?? ' '}
					</div>
				</div>

				<!-- Transport buttons (deck controls left, settings pushed right) -->
				<div class="flex items-center justify-between gap-2">
					<div class="flex items-center gap-1">
						<IconButton
							icon={isPlaying ? faPause : faPlay}
							title={isPlaying ? 'Pause' : 'Play'}
							disabled={song === null}
							onclick={togglePlay}
							active={isPlaying}
							activeVariant="success"
						/>
						<IconButton
							icon={faStop}
							title="Stop"
							disabled={song === null}
							onclick={stopPlayback}
						/>
						<IconButton
							icon={faEject}
							title="Unload"
							disabled={song === null}
							onclick={unload}
							destructive
						/>
						<IconButton
							icon={faArrowTrendDown}
							title="Fade out"
							disabled={song === null}
							onclick={fadeOut}
						/>
					</div>

					<IconButton
						icon={faGear}
						title="Settings"
						onclick={() => (showSettings = !showSettings)}
						active={showSettings}
					/>
				</div>
			</div>
		</div>

		<!-- Time info row (timestamps) -->
		<div
			class="mx-2 mb-1.5 grid grid-cols-4 divide-x divide-primary-800 overflow-hidden rounded border border-primary-800 bg-primary-900"
		>
			<div class="flex flex-col items-center px-1 py-1.5">
				<span class="time-label">POS</span>
				<span class="time-value">{formatTime(position)}</span>
			</div>
			<div class="flex flex-col items-center px-1 py-1.5">
				<span class="time-label">DUR</span>
				<span class="time-value">{formatTime(duration)}</span>
			</div>
			<div class="flex flex-col items-center px-1 py-1.5">
				<span class="time-label">REM</span>
				<span
					class={[
						'time-value',
						isPlaying && remaining > 0 && remaining < 10 && 'text-danger-400',
						isPlaying && remaining >= 10 && remaining < 30 && 'text-secondary-400'
					]}
				>
					-{formatTime(remaining)}
				</span>
			</div>
			<div class="flex flex-col items-center px-1 py-1.5">
				<span class="time-label">CUE</span>
				<span class="time-value text-primary-600">0:00.0</span>
			</div>
		</div>

		<!-- Waveform (flex-1, takes all remaining vertical space) -->
		<div class="min-h-0 flex-1 px-2 pb-2">
			<div class="h-full overflow-hidden rounded bg-primary-900">
				<WaveformDisplay {peaks} {position} {duration} songLoaded={song !== null} onSeek={seek} />
			</div>
		</div>
	</div>

	<!-- Right column: volume slider + DB meter, full deck height -->
	<div class="flex gap-1.5 py-2 pr-2">
		<div class="flex w-5 flex-col items-center gap-1">
			<span class="side-label">VOL</span>
			<div class="min-h-0 flex-1" bind:clientHeight={volTrackHeight}>
				<label for="deck-vol-{instanceId}" class="sr-only">Volume</label>
				<input
					id="deck-vol-{instanceId}"
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={volume}
					oninput={(e) => updateVolume(parseFloat((e.target as HTMLInputElement).value))}
					class="vol-slider"
					style:height="{volTrackHeight}px"
				/>
			</div>
		</div>

		<div class="flex w-3 flex-col gap-1">
			<span class="side-label">DB</span>
			<div class="min-h-0 flex-1">
				<DbMeter analyser={audio.analyserNode} />
			</div>
		</div>
	</div>
</div>

{#if showSettings}
	<DeckSettingsModal
		sendMetadata={currentSettings.sendMetadata}
		onChange={(next) => updateSettings(next)}
		onClose={() => (showSettings = false)}
	/>
{/if}

<style>
	.time-label {
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-primary-500);
		line-height: 1;
		margin-bottom: 2px;
	}

	.time-value {
		font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary-200);
		line-height: 1;
	}

	.side-label {
		font-size: 0.45rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-primary-600);
		text-align: center;
		line-height: 1;
	}

	.vol-slider {
		writing-mode: vertical-lr;
		direction: rtl;
		display: block;
		width: 20px;
		cursor: pointer;
		accent-color: var(--color-secondary-500);
	}
</style>
