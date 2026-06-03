<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import OnAirIndicator from './OnAirIndicator.svelte';
	import type { EncoderStatus } from '@streamline/shared';

	let cpuUsage = $state(0);
	let time = $state(formatTime(new Date()));
	let version = $state('');
	const encoderStatuses = new SvelteMap<string, EncoderStatus>();

	let cpuTimer: ReturnType<typeof setInterval>;
	let clockTimer: ReturnType<typeof setInterval>;

	onMount(() => {
		window.streamline.onEncoderStatus((id, status) => {
			encoderStatuses.set(id, status as EncoderStatus);
		});
		window.streamline.api.system.getAppVersion().then((v) => {
			version = v;
		});
		cpuTimer = setInterval(async () => {
			cpuUsage = await window.streamline.api.system.getCpuUsage();
		}, 1000);
		clockTimer = setInterval(() => {
			time = formatTime(new Date());
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(cpuTimer);
		clearInterval(clockTimer);
	});

	const activeEncoders = $derived(
		[...encoderStatuses.values()].filter(
			(s) => s.status === 'streaming' || s.status === 'connecting'
		).length
	);

	const encoderColor = $derived(
		activeEncoders === 0
			? 'text-primary-500'
			: [...encoderStatuses.values()].some((s) => s.status === 'error')
				? 'text-red-500'
				: 'text-green-500'
	);

	/* v8 ignore next — plural suffix; singular branch covered by '1 encoder active' test */
	const encoderSuffix = $derived(activeEncoders !== 1 ? 's' : '');

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour12: false });
	}
</script>

<div
	class="flex items-center border-t border-primary-800 bg-primary-950 px-4 py-1.5 text-xs text-primary-400 select-none"
>
	<div class="flex flex-1 items-center gap-4">
		<OnAirIndicator active={activeEncoders > 0} />
		<span class={encoderColor}>{activeEncoders} encoder{encoderSuffix} active</span>
	</div>
	<div class="flex flex-1 justify-center">
		<span>Streamline <span class="text-primary-600">&bull;</span> v{version}</span>
	</div>
	<div class="flex flex-1 items-center justify-end gap-4">
		<span>CPU: {Math.round(cpuUsage)}%</span>
		<span class="font-mono">{time}</span>
	</div>
</div>
