<script lang="ts">
	import { formatSampleRateKhz, parseSampleRateKhz } from '../../modules/encoders/sample-rate';
	import ComboField from './ComboField.svelte';

	interface Props {
		label: string;
		value: number;
		options?: number[];
	}
	let { label, value = $bindable(), options = [44100, 48000] }: Props = $props();
</script>

<ComboField
	{label}
	bind:value
	{options}
	suffix="kHz"
	decimal
	format={formatSampleRateKhz}
	parse={parseSampleRateKhz}
/>
