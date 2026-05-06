<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getAudioContext } from '../../audio/context';
	import { connectToMaster } from '../../audio/mixer-bridge';

	interface Props {
		instanceId: string;
	}
	const { instanceId }: Props = $props();

	let devices = $state<MediaDeviceInfo[]>([]);
	let selectedDeviceId = $state<string>('');
	let isLive = $state(false);
	let isLocked = $state(false);
	let volume = $state(1.0);
	let level = $state(-60);

	let stream: MediaStream | null = null;
	let sourceNode: MediaStreamAudioSourceNode | null = null;
	let gainNode: GainNode | null = null;
	let analyserNode: AnalyserNode | null = null;
	let rafId: number;

	onMount(async () => {
		await refreshDevices();
		navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
		rafId = requestAnimationFrame(tickLevel);
	});

	onDestroy(() => {
		navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
		cancelAnimationFrame(rafId);
		stopCapture();
	});

	async function refreshDevices() {
		const all = await navigator.mediaDevices.enumerateDevices();
		devices = all.filter((d) => d.kind === 'audioinput');
	}

	async function startCapture() {
		stopCapture();
		const ctx = getAudioContext();
		stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false
			}
		});
		sourceNode = ctx.createMediaStreamSource(stream);
		gainNode = ctx.createGain();
		gainNode.gain.value = 0;
		analyserNode = ctx.createAnalyser();
		analyserNode.fftSize = 2048;
		sourceNode.connect(gainNode);
		gainNode.connect(analyserNode);
		connectToMaster(gainNode);
	}

	function stopCapture() {
		gainNode?.disconnect();
		sourceNode?.disconnect();
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		sourceNode = null;
		gainNode = null;
		analyserNode = null;
	}

	function rampGain(targetValue: number, timeMs: number) {
		if (!gainNode) return;
		const ctx = getAudioContext();
		gainNode.gain.cancelScheduledValues(ctx.currentTime);
		gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
		gainNode.gain.linearRampToValueAtTime(targetValue, ctx.currentTime + timeMs / 1000);
	}

	function handlePttDown() {
		if (!gainNode) {
			startCapture()
				.then(() => {
					if (isLive) rampGain(volume, 10);
				})
				.catch((err) => {
					isLive = false;
					console.error('Mic capture failed:', err);
				});
		} else {
			rampGain(volume, 10);
		}
		isLive = true;
	}

	function handlePttUp() {
		if (isLocked) return;
		rampGain(0, 50);
		isLive = false;
	}

	function toggleLock() {
		isLocked = !isLocked;
		if (isLocked) {
			if (!gainNode) {
				startCapture()
					.then(() => {
						if (isLive) rampGain(volume, 10);
					})
					.catch((err) => {
						isLive = false;
						isLocked = false;
						console.error('Mic capture failed:', err);
					});
			} else {
				rampGain(volume, 10);
			}
			isLive = true;
		} else {
			rampGain(0, 50);
			isLive = false;
		}
	}

	const timeDomainBuf = new Float32Array(2048);
	function tickLevel() {
		if (analyserNode) {
			analyserNode.getFloatTimeDomainData(timeDomainBuf);
			let sum = 0;
			for (let i = 0; i < timeDomainBuf.length; i++) sum += timeDomainBuf[i] * timeDomainBuf[i];
			const rms = Math.sqrt(sum / timeDomainBuf.length);
			level = rms > 0 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
		}
		rafId = requestAnimationFrame(tickLevel);
	}
</script>

<div class="flex h-full flex-col gap-3 p-3">
	<!-- Device selector -->
	<label for="mic-device-{instanceId}" class="sr-only">Input Device</label>
	<select
		id="mic-device-{instanceId}"
		bind:value={selectedDeviceId}
		class="rounded border border-primary-700 bg-primary-800 px-2 py-1 text-sm text-primary-100"
		onchange={() => {
			if (gainNode)
				startCapture().catch((err) => {
					isLive = false;
					isLocked = false;
					console.error('Mic capture failed:', err);
				});
		}}
	>
		<option value="">System Default</option>
		{#each devices as d (d.deviceId)}
			<option value={d.deviceId}>{d.label || d.deviceId}</option>
		{/each}
	</select>

	<!-- Level meter -->
	<div class="h-3 overflow-hidden rounded bg-primary-800">
		<div
			class="h-full transition-none"
			class:bg-success-500={level < -6}
			class:bg-warning-500={level >= -6 && level < -0.1}
			class:bg-danger-500={level >= -0.1}
			style="width: {Math.max(0, ((level + 60) / 60) * 100)}%"
		></div>
	</div>

	<!-- Controls -->
	<div class="flex gap-2">
		<button
			class="flex-1 rounded py-3 text-sm font-bold transition-colors select-none"
			class:bg-danger-600={isLive && !isLocked}
			class:bg-primary-700={!isLive || isLocked}
			onpointerdown={handlePttDown}
			onpointerup={handlePttUp}
			onpointerleave={handlePttUp}
		>
			Push to Talk
		</button>

		<button
			class="rounded px-3 py-3 text-sm transition-colors"
			class:bg-danger-700={isLocked}
			class:bg-primary-700={!isLocked}
			onclick={toggleLock}
			title="Lock talk on/off"
		>
			{isLocked ? '🔴 LIVE' : '🔒'}
		</button>
	</div>

	<!-- Volume -->
	<div class="flex items-center gap-2 text-xs text-primary-400">
		<label for="mic-vol-{instanceId}">Vol</label>
		<input
			id="mic-vol-{instanceId}"
			type="range"
			min="0"
			max="1"
			step="0.01"
			bind:value={volume}
			oninput={() => {
				if (isLive) rampGain(volume, 10);
			}}
			class="flex-1 accent-secondary-500"
		/>
	</div>
</div>
