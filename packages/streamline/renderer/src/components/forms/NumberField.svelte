<script lang="ts">
	import { untrack } from 'svelte';
	import FormField from './FormField.svelte';

	interface Props {
		label: string;
		value: number;
		unit?: string;
		min?: number;
		max?: number;
		decimal?: boolean;
	}
	let { label, value = $bindable(), unit, min, max, decimal = false }: Props = $props();

	let text = $state(untrack(() => String(value)));
	// Tracks which value the displayed text reflects so an externally re-bound
	// `value` updates the display without overwriting transient user typing.
	let textOwnsValue = value;

	/* v8 ignore next -- @preserve: reactive sync when parent re-binds value; requires wrapper component to test */
	$effect(() => {
		if (value !== textOwnsValue) {
			text = String(value);
			textOwnsValue = value;
		}
	});

	function commit(raw: string) {
		text = raw;
		const parsed = decimal ? parseFloat(raw) : parseInt(raw, 10);
		if (Number.isNaN(parsed)) return;
		let next = parsed;
		if (min !== undefined && next < min) next = min;
		if (max !== undefined && next > max) next = max;
		value = next;
		textOwnsValue = next;
	}

	function handleBlur() {
		text = String(value);
		textOwnsValue = value;
	}
</script>

<FormField {label}>
	<div class="relative">
		<input
			type="text"
			inputmode={decimal ? 'decimal' : 'numeric'}
			pattern={decimal ? '[0-9.]*' : '[0-9]*'}
			value={text}
			oninput={(event) => commit((event.target as HTMLInputElement).value)}
			onblur={handleBlur}
			class={['form-input', unit && 'pr-12']}
		/>
		{#if unit}
			<span class="form-input-suffix">{unit}</span>
		{/if}
	</div>
</FormField>
