<script lang="ts" module>
	export interface ToastItem {
		id: string;
		message: string;
		type: 'error' | 'warning' | 'info';
	}
</script>

<script lang="ts">
	import Toast from './Toast.svelte';

	let toasts = $state<ToastItem[]>([]);

	export function addToast(message: string, type: ToastItem['type'] = 'info', durationMs = 8000) {
		const id = crypto.randomUUID();
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => removeToast(id), durationMs);
	}

	function removeToast(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	}
</script>

<div class="fixed right-4 bottom-12 z-50 flex flex-col gap-2">
	{#each toasts as toast (toast.id)}
		<Toast message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
	{/each}
</div>
