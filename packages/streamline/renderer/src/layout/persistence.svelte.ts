import { layoutStore } from './store.svelte';

const DEBOUNCE_MS = 500;

// Must be called at Svelte component initialization (top-level, not in onMount)
export function startLayoutPersistence(): void {
	$effect(() => {
		const layout = layoutStore.active;
		if (!layout) return;
		const timer = setTimeout(() => {
			window.streamline.api.layout
				.save(layout)
				.catch((e) => console.error('layout save failed', e));
		}, DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});
}
