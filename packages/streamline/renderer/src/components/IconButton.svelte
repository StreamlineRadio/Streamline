<script lang="ts">
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

	type ActiveVariant = 'secondary' | 'success' | 'danger';
	type Size = 'xs' | 'sm' | 'md';

	interface Props {
		icon: IconDefinition;
		title: string;
		onclick?: (event: MouseEvent) => void;
		ondblclick?: (event: MouseEvent) => void;
		disabled?: boolean;
		active?: boolean;
		activeVariant?: ActiveVariant;
		destructive?: boolean;
		size?: Size;
	}

	const {
		icon,
		title,
		onclick,
		ondblclick,
		disabled = false,
		active = false,
		activeVariant = 'secondary',
		destructive = false,
		size = 'md'
	}: Props = $props();
</script>

<button
	type="button"
	{title}
	aria-label={title}
	{disabled}
	{onclick}
	{ondblclick}
	class={[
		'flex items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
		size === 'xs' ? 'h-6 w-6 text-xs' : size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base',
		active
			? activeVariant === 'success'
				? 'border-success-700 bg-success-900 text-success-400 hover:border-success-600 hover:bg-success-800 hover:text-success-300'
				: activeVariant === 'danger'
					? 'border-danger-500 bg-danger-700 text-primary-50 hover:bg-danger-600'
					: 'border-secondary-600 bg-primary-800 text-secondary-400'
			: destructive
				? 'border-primary-700 bg-primary-800 text-primary-200 hover:border-danger-700 hover:bg-danger-950 hover:text-danger-400'
				: 'border-primary-700 bg-primary-800 text-primary-200 hover:border-primary-600 hover:bg-primary-700 hover:text-primary-50'
	]}
>
	<FontAwesomeIcon {icon} />
</button>
