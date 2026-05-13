<script lang="ts">
	import FormField from './FormField.svelte';

	interface Props {
		label: string;
		value: string;
		placeholder?: string;
		type?: 'text' | 'password';
		mono?: boolean;
	}
	let {
		label,
		value = $bindable(),
		placeholder = '',
		type = 'text',
		mono = false
	}: Props = $props();
</script>

<FormField {label}>
	{#if type === 'password'}
		<input
			type="password"
			bind:value
			{placeholder}
			class={['form-input', mono && 'font-mono text-xs']}
		/>
	{:else}
		<input
			type="text"
			bind:value
			{placeholder}
			class={['form-input', mono && 'font-mono text-xs']}
		/>
	{/if}
</FormField>
