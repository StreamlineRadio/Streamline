<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import OnAirIndicator from './OnAirIndicator.svelte';
	import type { EncoderStatus } from '@streamline/shared';

	let cpuUsage = $state(0);
	let time = $state(formatTime(new Date()));
	const encoderStatuses = new SvelteMap<string, EncoderStatus>();

	let cpuTimer: ReturnType<typeof setInterval>;
	let clockTimer: ReturnType<typeof setInterval>;

	onMount(() => {
		window.streamline.onEncoderStatus((id, status) => {
			encoderStatuses.set(id, status as EncoderStatus);
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

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour12: false });
	}
</script>

<div
	class="flex items-center gap-4 border-t border-primary-800 bg-primary-950 px-4 py-1.5 text-xs text-primary-400 select-none"
>
	<OnAirIndicator active={activeEncoders > 0} />
	<span class={encoderColor}>{activeEncoders} encoder{activeEncoders !== 1 ? 's' : ''} active</span>
	<span class="ml-auto">CPU: {Math.round(cpuUsage)}%</span>
	<span class="font-mono">{time}</span>
</div>
