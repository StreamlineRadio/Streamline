<script lang="ts">
	interface Props {
		message: string;
		type: 'error' | 'warning' | 'info';
		onClose: () => void;
	}
	const { message, type, onClose }: Props = $props();

	const styles = {
		error: {
			surface: 'border-danger-600 bg-danger-950 text-danger-50',
			accent: 'bg-danger-500',
			glyph: 'text-danger-300',
			close: 'text-danger-300 hover:text-danger-50',
			icon: '⊘'
		},
		warning: {
			surface: 'border-warning-600 bg-warning-950 text-warning-50',
			accent: 'bg-warning-500',
			glyph: 'text-warning-300',
			close: 'text-warning-300 hover:text-warning-50',
			icon: '⚠'
		},
		info: {
			surface: 'border-info-600 bg-info-950 text-info-50',
			accent: 'bg-info-500',
			glyph: 'text-info-300',
			close: 'text-info-300 hover:text-info-50',
			icon: 'ℹ'
		}
	} as const;
	const style = $derived(styles[type]);
</script>

<div
	class="relative flex items-start gap-3 overflow-hidden rounded-lg border py-3 pr-3 pl-4 text-sm shadow-xl {style.surface}"
	role="alert"
>
	<span class="absolute inset-y-0 left-0 w-1 {style.accent}" aria-hidden="true"></span>
	<span class="flex-shrink-0 leading-5 {style.glyph}" aria-hidden="true">{style.icon}</span>
	<span class="flex-1 leading-5">{message}</span>
	<button onclick={onClose} aria-label="Dismiss" class="flex-shrink-0 leading-5 {style.close}"
		>✕</button
	>
</div>
