<script lang="ts">
	import ComboField from './ComboField.svelte';

	interface Props {
		label: string;
		value: number;
		options?: number[];
	}
	let { label, value = $bindable(), options = [44100, 48000] }: Props = $props();

	function format(hz: number): string {
		const khz = hz / 1000;
		return Number.isInteger(khz) ? `${khz}.0` : String(khz);
	}

	function parse(text: string): number | null {
		const khz = parseFloat(text);
		return Number.isFinite(khz) ? Math.round(khz * 1000) : null;
	}
</script>

<ComboField {label} bind:value {options} suffix="kHz" decimal {format} {parse} />
