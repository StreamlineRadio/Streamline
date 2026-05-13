<script lang="ts" generics="T extends string | number">
	import type { Snippet } from 'svelte';
	import FormField from './FormField.svelte';

	interface Props {
		label: string;
		value: T;
		children: Snippet;
	}
	let { label, value = $bindable(), children }: Props = $props();
</script>

<FormField {label}>
	<select bind:value class="form-input">
		{@render children()}
	</select>
</FormField>
