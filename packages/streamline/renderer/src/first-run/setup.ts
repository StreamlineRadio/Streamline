import { buildDefaultLayout } from './default-layout';
import { layoutStore } from '../layout/store.svelte';
import { instanceStore } from '../modules/instance-store.svelte';

export async function maybeRunFirstRun(): Promise<void> {
	const done = await window.streamline.api.settings.get('firstRunComplete');
	if (done) return;

	const layout = buildDefaultLayout();
	await window.streamline.api.layout.save(layout);
	await window.streamline.api.settings.set('firstRunComplete', '1');

	layoutStore.set(layout);
	for (const instance of layout.instances) {
		instanceStore.add(instance);
	}
}
