<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		children: Snippet;
	}
	const { label, children }: Props = $props();
</script>

<label class="flex flex-col gap-1">
	<span class="form-field-label">{label}</span>
	{@render children()}
</label>
