<script lang="ts" module>
	export interface ToastItem {
		id: string;
		message: string;
		type: 'error' | 'warning' | 'success' | 'info';
		durationMs: number;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import Toast from './Toast.svelte';
	import { eventBus } from '../modules/event-bus';

	let toasts = $state<ToastItem[]>([]);

	export function addToast(message: string, type: ToastItem['type'] = 'info', durationMs = 8000) {
		const id = crypto.randomUUID();
		toasts = [...toasts, { id, message, type, durationMs }];
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
		<div in:fly={{ x: 24, duration: 200 }}>
			<Toast
				message={toast.message}
				type={toast.type}
				durationMs={toast.durationMs}
				onClose={() => removeToast(toast.id)}
			/>
		</div>
	{/each}
</div>
