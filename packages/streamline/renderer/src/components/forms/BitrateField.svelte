<script lang="ts">
	import ComboField from './ComboField.svelte';

	interface Props {
		label: string;
		value: number;
		options?: number[];
	}
	let { label, value = $bindable(), options = [64, 96, 128, 192, 256, 320] }: Props = $props();
</script>

<ComboField {label} bind:value {options} suffix="kbps" />
