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
	let unsubscribeEncoderStatus: (() => void) | undefined;

	onMount(() => {
		unsubscribeEncoderStatus = window.streamline.onEncoderStatus((id, status) => {
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
		unsubscribeEncoderStatus?.();
	});

	const streamingEncoders = $derived(
		[...encoderStatuses.values()].filter((s) => s.status === 'streaming').length
	);

	const reconnectingEncoders = $derived(
		[...encoderStatuses.values()].filter((s) => s.status === 'reconnecting').length
	);

	const activeEncoders = $derived(
		[...encoderStatuses.values()].filter(
			(s) => s.status === 'streaming' || s.status === 'connecting' || s.status === 'reconnecting'
		).length
	);

	const encoderColor = $derived(
		activeEncoders === 0
			? 'text-primary-500'
			: [...encoderStatuses.values()].some((s) => s.status === 'error')
				? 'text-red-500'
				: reconnectingEncoders > 0
					? 'text-amber-500'
					: 'text-green-500'
	);

	const encoderCountText = $derived(
		`${activeEncoders} encoder${activeEncoders !== 1 ? 's' : ''} active`
	);

	const versionLabel = $derived(`v${version}`);
	const cpuText = $derived(`CPU: ${Math.round(cpuUsage)}%`);

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour12: false });
	}
</script>

<div
	class="flex items-center border-t border-primary-800 bg-primary-950 px-4 py-1.5 text-xs text-primary-400 select-none"
>
	<div class="flex flex-1 items-center gap-4">
		<OnAirIndicator active={streamingEncoders > 0} reconnecting={reconnectingEncoders > 0} />
		<span class={encoderColor}>{encoderCountText}</span>
	</div>
	<div class="flex flex-1 justify-center">
		<span>Streamline <span class="text-primary-600">&bull; </span>{versionLabel}</span>
	</div>
	<div class="flex flex-1 items-center justify-end gap-4">
		<span>{cpuText}</span>
		<span class="font-mono">{time}</span>
	</div>
</div>
