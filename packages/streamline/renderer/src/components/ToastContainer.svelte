<script lang="ts" module>
	export interface ToastItem {
		id: string;
		message: string;
		type: 'error' | 'warning' | 'info';
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import Toast from './Toast.svelte';
	import { eventBus } from '../modules/event-bus';

	let toasts = $state<ToastItem[]>([]);

	export function addToast(message: string, type: ToastItem['type'] = 'info', durationMs = 8000) {
		const id = crypto.randomUUID();
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => removeToast(id), durationMs);
	}

	function removeToast(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	onMount(() =>
		eventBus.on('toast:show', (payload) => {
			const { message, type, durationMs } = payload as {
				message: string;
				type?: ToastItem['type'];
				durationMs?: number;
			};
			addToast(message, type ?? 'info', durationMs ?? 8000);
		})
	);
</script>

<div class="fixed right-4 bottom-12 z-50 flex flex-col gap-2">
	{#each toasts as toast (toast.id)}
		<Toast message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
	{/each}
</div>
