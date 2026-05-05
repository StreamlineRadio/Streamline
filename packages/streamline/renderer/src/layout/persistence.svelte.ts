import { layoutStore } from './store.svelte';

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

export function startLayoutPersistence(): void {
	$effect(() => {
		const layout = layoutStore.active;
		if (!layout) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			window.streamline.api.layout
				.save(layout)
				.catch((e) => console.error('layout save failed', e));
		}, DEBOUNCE_MS);
	});
}
