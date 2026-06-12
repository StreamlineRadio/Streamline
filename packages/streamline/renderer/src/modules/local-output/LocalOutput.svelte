<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getAudioContext } from '../../audio/context';
	import { getMonitorBus } from '../../audio/mixer-bridge';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	let devices = $state<MediaDeviceInfo[]>([]);
	let selectedDeviceId = $state<string>('');
	let volume = $state(1.0);

	let audioCtx: AudioContext | null = null;
	let gainNode: GainNode | null = null;
	let audioEl: HTMLAudioElement | null = null;
	let destNode: MediaStreamAudioDestinationNode | null = null;

	onMount(async () => {
		audioCtx = getAudioContext();
		gainNode = audioCtx.createGain();
		gainNode.gain.value = volume;
		getMonitorBus().connect(gainNode);

		destNode = audioCtx.createMediaStreamDestination();
		gainNode.connect(destNode);
		audioEl = new Audio();
		audioEl.srcObject = destNode.stream;
		/* v8 ignore next -- @preserve: audioEl.play() always resolves in test mock; catch branch unreachable */
		try {
			await audioEl.play();
		} catch (err) {
			console.error('[LocalOutput] audioEl.play() failed:', err);
		}

		await refreshDevices();
		navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
	});

	onDestroy(() => {
		navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
		// disconnect() only severs outgoing edges; the bus holds the incoming one
		if (gainNode) getMonitorBus().disconnect(gainNode);
		gainNode?.disconnect();
		destNode?.disconnect();
		/* v8 ignore else -- @preserve: audioEl is assigned synchronously in onMount before any teardown */
		if (audioEl) {
			audioEl.pause();
			audioEl.srcObject = null;
		}
	});

	async function refreshDevices() {
		const all = await navigator.mediaDevices.enumerateDevices();
		devices = all.filter((d) => d.kind === 'audiooutput');
	}

	/* v8 ignore next -- @preserve: Web Audio + setSinkId not available in jsdom */
	async function changeDevice(deviceId: string) {
		const previousDeviceId = selectedDeviceId;
		selectedDeviceId = deviceId;
		try {
			if (audioCtx && 'setSinkId' in AudioContext.prototype) {
				await (audioCtx as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(
					deviceId
				);
			} else if (audioEl && 'setSinkId' in audioEl) {
				await (audioEl as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(
					deviceId
				);
			}
		} catch (err) {
			console.error('[LocalOutput] changeDevice failed:', err);
			selectedDeviceId = previousDeviceId;
		}
	}

	function updateVolume(v: number) {
		volume = v;
		/* v8 ignore else -- @preserve: gainNode is assigned synchronously in onMount before any input */
		if (gainNode) gainNode.gain.value = v;
	}

	const deviceSelectId = $derived('output-device-' + instanceId);
	const volSliderId = $derived('output-vol-' + instanceId);
</script>

<div class="flex flex-col gap-4 p-4">
	<div class="flex flex-col gap-1">
		<label class="text-xs text-primary-400" for={deviceSelectId}>Output Device</label>
		<select
			id={deviceSelectId}
			class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-sm text-primary-100"
			value={selectedDeviceId}
			onchange={(e) => changeDevice((e.target as HTMLSelectElement).value)}
		>
			<option value="">System Default</option>
			{#each devices as device (device.deviceId)}
				<option value={device.deviceId} label={device.label || device.deviceId}></option>
			{/each}
		</select>
	</div>

	<div class="flex flex-col gap-1">
		<label class="text-xs text-primary-400" for={volSliderId}>Volume</label>
		<input
			id={volSliderId}
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={volume}
			oninput={(e) => updateVolume(parseFloat((e.target as HTMLInputElement).value))}
			class="w-full accent-secondary-500"
		/>
	</div>
</div>
