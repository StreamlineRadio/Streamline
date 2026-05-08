<script lang="ts">
	interface Props {
		active: boolean;
	}
	const { active }: Props = $props();
</script>

<div class="flex items-center gap-1.5">
	<div
		class="h-2.5 w-2.5 rounded-full"
		class:bg-danger-500={active}
		class:shadow-danger={active}
		class:animate-pulse={active}
		class:bg-primary-700={!active}
	></div>
	<span class:text-danger-400={active} class:font-bold={active}>
		{active ? 'ON AIR' : 'OFF AIR'}
	</span>
</div>
