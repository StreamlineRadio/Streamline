import { layoutStore } from './store.svelte';

const DEBOUNCE_MS = 500;

// Must be called at Svelte component initialization (top-level, not in onMount)
export function startLayoutPersistence(): void {
	/* v8 ignore next 10 — $effect requires Svelte component context; tested via WindowManager component spec */
	$effect(() => {
		const layout = layoutStore.active;
		if (!layout) return;
		const snapshot = $state.snapshot(layout);
		const timer = setTimeout(() => {
			window.streamline.api.layout
				.save(snapshot)
				.catch((e) => console.error('layout save failed', e));
		}, DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});
}
