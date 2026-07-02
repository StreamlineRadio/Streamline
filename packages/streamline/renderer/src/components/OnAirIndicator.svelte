<script lang="ts">
	interface Props {
		active: boolean;
		reconnecting?: boolean;
	}
	const { active, reconnecting = false }: Props = $props();

	const showReconnecting = $derived(!active && reconnecting);
	const label = $derived(active ? 'ON AIR' : showReconnecting ? 'RECONNECTING' : 'OFF AIR');
</script>

<div class="flex items-center gap-1.5">
	<div
		class="h-2.5 w-2.5 rounded-full"
		class:bg-danger-500={active}
		class:shadow-danger={active}
		class:animate-pulse={active || showReconnecting}
		class:bg-warning-500={showReconnecting}
		class:bg-primary-700={!active && !showReconnecting}
	></div>
	<span
		class:text-danger-400={active}
		class:text-warning-400={showReconnecting}
		class:font-bold={active || showReconnecting}
	>
		{label}
	</span>
</div>
