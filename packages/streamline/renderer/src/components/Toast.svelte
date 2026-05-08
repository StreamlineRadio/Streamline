<script lang="ts">
	interface Props {
		message: string;
		type: 'error' | 'warning' | 'info';
		onClose: () => void;
	}
	const { message, type, onClose }: Props = $props();
</script>

<div
	class="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl"
	class:bg-red-900={type === 'error'}
	class:border-red-700={type === 'error'}
	class:bg-yellow-900={type === 'warning'}
	class:border-yellow-700={type === 'warning'}
	class:bg-blue-900={type === 'info'}
	class:border-blue-700={type === 'info'}
>
	<span class="flex-1">{message}</span>
	<button onclick={onClose} class="flex-shrink-0 text-primary-400 hover:text-primary-100">✕</button>
</div>
