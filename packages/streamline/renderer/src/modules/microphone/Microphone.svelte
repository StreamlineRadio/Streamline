<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faMicrophone,
		faLock,
		faLockOpen,
		faTowerBroadcast,
		faHeadphones,
		faHeadphonesSimple
	} from '@fortawesome/free-solid-svg-icons';
	import { getAudioContext } from '../../audio/context';
	import { connectToBroadcastOnly } from '../../audio/mixer-bridge';
	import DbMeter from '../../components/DbMeter.svelte';
	import IconButton from '../../components/IconButton.svelte';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	let devices = $state<MediaDeviceInfo[]>([]);
	let selectedDeviceId = $state<string>('');
	let isLive = $state(false);
	let isLocked = $state(false);
	let isMonitoring = $state(false);
	let volume = $state(1.0);
	let volTrackHeight = $state(0);

	const audioCtx = getAudioContext();
	const gainNode = audioCtx.createGain();
	gainNode.gain.value = 0;
	const analyserNode = audioCtx.createAnalyser();
	analyserNode.fftSize = 2048;
	gainNode.connect(analyserNode);
	// Broadcast-only: the mic must not reach LocalOutput's monitor mix, or the
	// DJ would always hear themselves while live regardless of the toggle below
	connectToBroadcastOnly(gainNode);

	// Parallel monitor path → speakers, independent of broadcast gain
	const monitorGain = audioCtx.createGain();
	monitorGain.gain.value = 0;
	monitorGain.connect(audioCtx.destination);

	let stream: MediaStream | null = null;
	let sourceNode: MediaStreamAudioSourceNode | null = null;
	let pttHeld = false;

	onMount(async () => {
		await refreshDevices();
		navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
	});

	onDestroy(() => {
		navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
		stopCapture();
		gainNode.disconnect();
		analyserNode.disconnect();
		monitorGain.disconnect();
	});

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	async function refreshDevices() {
		const allDevices = await navigator.mediaDevices.enumerateDevices();
		devices = allDevices.filter((device) => device.kind === 'audioinput');
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	async function startCapture() {
		stopCapture();
		stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false
			}
		});
		sourceNode = audioCtx.createMediaStreamSource(stream);
		sourceNode.connect(gainNode);
		sourceNode.connect(monitorGain);
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	function stopCapture() {
		sourceNode?.disconnect();
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
		sourceNode = null;
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	function rampGain(targetValue: number, timeMs: number) {
		gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
		gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
		gainNode.gain.linearRampToValueAtTime(targetValue, audioCtx.currentTime + timeMs / 1000);
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	function rampMonitor(targetValue: number, timeMs: number) {
		monitorGain.gain.cancelScheduledValues(audioCtx.currentTime);
		monitorGain.gain.setValueAtTime(monitorGain.gain.value, audioCtx.currentTime);
		monitorGain.gain.linearRampToValueAtTime(targetValue, audioCtx.currentTime + timeMs / 1000);
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	function applyAudio(timeMs = 10) {
		rampGain(isLive ? volume : 0, timeMs);
		rampMonitor(isMonitoring ? volume : 0, timeMs);
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	async function ensureCapture(): Promise<boolean> {
		if (sourceNode) return true;
		try {
			await startCapture();
			return true;
		} catch (err) {
			console.error('Mic capture failed:', err);
			return false;
		}
	}

	/* v8 ignore next -- @preserve: PTT hotkey handlers require audio capture; not testable in jsdom */
	function handlePttDown() {
		pttHeld = true;
		if (isLocked) isLocked = false;
		isLive = true;
		ensureCapture().then((ok) => {
			if (!ok) {
				pttHeld = false;
				isLive = false;
				applyAudio(50);
				return;
			}
			applyAudio(10);
		});
	}

	/* v8 ignore next -- @preserve: PTT hotkey handlers require audio capture; not testable in jsdom */
	function handlePttRelease() {
		if (!pttHeld) return;
		pttHeld = false;
		isLive = false;
		applyAudio(50);
	}

	/* v8 ignore next -- @preserve: PTT hotkey handlers require audio capture; not testable in jsdom */
	function toggleLock() {
		const next = !isLocked;
		isLocked = next;
		if (next) {
			isLive = true;
			ensureCapture().then((ok) => {
				if (!ok) {
					isLive = false;
					isLocked = false;
					applyAudio(50);
					return;
				}
				applyAudio(10);
			});
		} else {
			isLive = false;
			applyAudio(50);
		}
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	async function handleDeviceChange() {
		if (!sourceNode) return;
		try {
			await startCapture();
		} catch (err) {
			console.error('Mic capture failed:', err);
		}
	}

	/* v8 ignore next -- @preserve: getUserMedia + Web Audio not available in jsdom */
	function toggleMonitor() {
		const next = !isMonitoring;
		isMonitoring = next;
		if (next) {
			ensureCapture().then((ok) => {
				if (!ok) {
					isMonitoring = false;
					applyAudio(50);
					return;
				}
				applyAudio(10);
			});
		} else {
			applyAudio(50);
		}
	}

	const micDeviceSelectId = $derived('mic-device-' + instanceId);
	const micVolSliderId = $derived('mic-vol-' + instanceId);
	/* v8 ignore next -- @preserve: FontAwesomeIcon reads the icon prop once at mount; the toggled arm is never re-read */
	const monitorIcon = $derived(isMonitoring ? faHeadphones : faHeadphonesSimple);
	const monitorTitle = $derived(isMonitoring ? 'Stop hearing yourself' : 'Hear yourself');
	const lockTitle = $derived(isLocked ? 'Release talk lock' : 'Lock talk on');
	const lockClass = $derived(
		isLocked
			? 'border-danger-500 bg-danger-700 text-primary-50 hover:bg-danger-600'
			: 'border-primary-700 bg-primary-900 text-primary-400 hover:border-secondary-600 hover:text-secondary-300'
	);
	/* v8 ignore next -- @preserve: FontAwesomeIcon reads the icon prop once at mount; the toggled arm is never re-read */
	const lockIcon = $derived(isLocked ? faLock : faLockOpen);
	const lockLabel = $derived(isLocked ? 'Locked' : 'Lock Talk');
	const heightStyle = $derived(`${volTrackHeight}px`);
</script>

<div
	class="relative flex h-full flex-col overflow-hidden bg-primary-950 text-primary-100 select-none"
>
	<!-- Top accent bar — slides in when on-air (mirrors Deck pattern) -->
	<div
		class="absolute inset-x-0 top-0 z-10 h-0.5 origin-left bg-danger-500 transition-transform duration-300"
		style="transform: scaleX({isLive ? 1 : 0})"
	></div>

	<div class="flex min-h-0 flex-1">
		<!-- Left column: device select, big PTT button, lock pill -->
		<div class="flex min-w-0 flex-1 flex-col gap-3 p-3">
			<!-- Top row: device dropdown + monitor toggle + on-air badge -->
			<div class="flex items-center gap-2">
				<label for={micDeviceSelectId} class="sr-only">Input device</label>
				<select
					id={micDeviceSelectId}
					bind:value={selectedDeviceId}
					onchange={handleDeviceChange}
					class="min-w-0 flex-1 rounded border border-primary-700 bg-primary-900 px-2 py-1 text-xs text-primary-100 outline-none focus:border-secondary-500"
				>
					<option value="">System Default</option>
					{#each devices as device (device.deviceId)}
						<option value={device.deviceId} label={device.label || device.deviceId}></option>
					{/each}
				</select>

				<IconButton
					icon={monitorIcon}
					title={monitorTitle}
					onclick={toggleMonitor}
					active={isMonitoring}
					size="xs"
				/>

				<div
					class={[
						'flex shrink-0 items-center gap-1 rounded border px-1.5 py-1 text-[0.55rem] font-bold tracking-[0.18em] uppercase transition-colors',
						isLive
							? 'border-danger-400 bg-danger-600 text-primary-50'
							: 'border-primary-700 bg-primary-900 text-primary-500'
					]}
				>
					<FontAwesomeIcon icon={faTowerBroadcast} />
					<span>On Air</span>
				</div>
			</div>

			<!-- Center: hold-to-talk button -->
			<div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
				<button
					aria-label="Hold to talk"
					aria-pressed={isLive}
					onpointerdown={handlePttDown}
					onpointerup={handlePttRelease}
					onpointerleave={handlePttRelease}
					onpointercancel={handlePttRelease}
					class={[
						'ptt-button group relative flex aspect-square w-full max-w-[150px] items-center justify-center rounded-full border-2 transition-all duration-150',
						isLive
							? 'border-danger-400 bg-danger-600 text-primary-50 shadow-[0_0_24px_var(--color-danger-500)]'
							: 'border-primary-700 bg-primary-900 text-primary-300 hover:border-secondary-500 hover:text-secondary-200'
					]}
				>
					{#if isLive}
						<span class="absolute inset-0 animate-ping rounded-full bg-danger-500/40"></span>
					{/if}
					<div class="relative flex flex-col items-center gap-1.5">
						<FontAwesomeIcon icon={faMicrophone} class="text-3xl" />
						<span class="text-[0.6rem] font-bold tracking-[0.2em] uppercase">
							{isLive ? 'Live' : 'Hold'}
						</span>
					</div>
				</button>

				<!-- Small lock-talk pill underneath -->
				<button
					onclick={toggleLock}
					title={lockTitle}
					class={[
						'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6rem] font-bold tracking-[0.18em] uppercase transition-colors',
						lockClass
					]}
				>
					<FontAwesomeIcon icon={lockIcon} />
					<span>{lockLabel}</span>
				</button>
			</div>
		</div>

		<!-- Right column: vertical vol + DB meter (matching Deck) -->
		<div class="flex gap-1.5 py-3 pr-2">
			<div class="flex w-5 flex-col items-center gap-1">
				<span class="side-label">VOL</span>
				<div class="min-h-0 flex-1" bind:clientHeight={volTrackHeight}>
					<label for={micVolSliderId} class="sr-only">Volume</label>
					<input
						id={micVolSliderId}
						type="range"
						min="0"
						max="1"
						step="0.01"
						bind:value={volume}
						oninput={() => applyAudio(10)}
						class="vol-slider"
						style:height={heightStyle}
					/>
				</div>
			</div>

			<div class="flex w-3 flex-col gap-1">
				<span class="side-label">DB</span>
				<div class="min-h-0 flex-1">
					<DbMeter analyser={analyserNode} />
				</div>
			</div>
		</div>
	</div>
</div>

<style>
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

	.ptt-button:active {
		transform: scale(0.97);
	}
</style>
