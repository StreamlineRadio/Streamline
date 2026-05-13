<script lang="ts">
	import FormField from './FormField.svelte';

	interface Props {
		label: string;
		value: string;
		extension: string;
		placeholder?: string;
	}
	let { label, value = $bindable(), extension, placeholder = 'recording' }: Props = $props();

	const suffix = $derived(`.${extension}`);
	// `ch` is the width of the "0" glyph in monospace — accurate as long as the input
	// uses font-mono. 0.75rem accounts for the gap between text and suffix + right padding.
	const suffixPadding = $derived(`calc(${suffix.length}ch + 0.75rem)`);
</script>

<FormField {label}>
	<div class="relative">
		<input
			type="text"
			bind:value
			{placeholder}
			class="form-input font-mono text-xs"
			style:padding-right={suffixPadding}
		/>
		<span class="form-input-suffix">{suffix}</span>
	</div>
</FormField>
