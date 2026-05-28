import type { Layout } from '@streamline/shared';
import { buildDefaultLayout } from './default-layout';
import { layoutStore } from '../layout/store.svelte';
import { instanceStore } from '../modules/instance-store.svelte';
import { hotkeyStore } from '../hotkeys/store.svelte';

export async function seedDefaultHotkeys(layout: Layout): Promise<void> {
	const deckA = layout.instances.find((i) => i.moduleId === 'deck' && i.title === 'A');
	const deckB = layout.instances.find((i) => i.moduleId === 'deck' && i.title === 'B');
	const queue = layout.instances.find((i) => i.moduleId === 'queue');
	const mic = layout.instances.find((i) => i.moduleId === 'microphone');

	const defaultBindings = [
		deckA && { id: crypto.randomUUID(), instanceId: deckA.id, action: 'play', accelerator: 'F1' },
		deckA && { id: crypto.randomUUID(), instanceId: deckA.id, action: 'pause', accelerator: 'F2' },
		deckB && { id: crypto.randomUUID(), instanceId: deckB.id, action: 'play', accelerator: 'F3' },
		deckB && { id: crypto.randomUUID(), instanceId: deckB.id, action: 'pause', accelerator: 'F4' },
		queue && {
			id: crypto.randomUUID(),
			instanceId: queue.id,
			action: 'pushToDeck',
			accelerator: 'F5'
		},
		mic && { id: crypto.randomUUID(), instanceId: mic.id, action: 'pttDown', accelerator: 'Space' }
	].filter(Boolean);

	for (const binding of defaultBindings) {
		await hotkeyStore.bind(binding!);
	}
}

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

	await seedDefaultHotkeys(layout);
}
