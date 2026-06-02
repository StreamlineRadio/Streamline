import { buildDefaultLayout } from '../first-run/default-layout';
import { seedDefaultHotkeys } from '../first-run/setup';
import { layoutStore } from '../layout/store.svelte';
import { instanceStore } from '../modules/instance-store.svelte';
import { hotkeyStore } from './store.svelte';
import { eventBus } from '../modules/event-bus';

export const TAP_WINDOW_MS = 800;
const REQUIRED_TAPS = 3;
const RESET_KEY_CODE = 'KeyR';

export function createTripleTapHandler(onFire: () => void): (event: KeyboardEvent) => void {
	let count = 0;
	let lastTapAt = 0;

	return function onKeyDown(event: KeyboardEvent) {
		if (event.repeat) return;

		const target = event.target as HTMLElement | null;
		if (target?.isContentEditable) return;
		if (target?.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

		const hasResetModifiers = (event.ctrlKey || event.metaKey) && event.shiftKey;
		const isResetKey = event.code === RESET_KEY_CODE;
		if (!hasResetModifiers || !isResetKey) return;

		const now = Date.now();
		count = now - lastTapAt > TAP_WINDOW_MS ? 1 : count + 1;
		lastTapAt = now;
		event.preventDefault();

		if (count >= REQUIRED_TAPS) {
			count = 0;
			onFire();
		}
	};
}

/* v8 ignore next 32 — complex IPC flow that resets stores; covered by integration/E2E */
export async function resetToDefault(): Promise<void> {
	const existingLayoutId = layoutStore.active?.id;

	for (const binding of [...hotkeyStore.all]) {
		await hotkeyStore.unbind(binding.id);
	}

	const layout = buildDefaultLayout();
	if (existingLayoutId) {
		layout.id = existingLayoutId;
		for (const instance of layout.instances) {
			instance.layoutId = existingLayoutId;
		}
	}
	await window.streamline.api.layout.save(layout);

	for (const id of [...instanceStore.all.keys()]) {
		instanceStore.remove(id);
	}
	layoutStore.set(layout);
	for (const instance of layout.instances) {
		instanceStore.add(instance);
	}

	await seedDefaultHotkeys(layout);

	eventBus.emit('toast:show', {
		message: 'Reset to default layout and hotkeys',
		type: 'info'
	});
}

export function initResetToDefaultHotkey(): () => void {
	const onKeyDown = createTripleTapHandler(() => {
		/* v8 ignore next — resetToDefault IPC flow not exercised in unit tests */
		void resetToDefault();
	});
	window.addEventListener('keydown', onKeyDown);
	return () => window.removeEventListener('keydown', onKeyDown);
}
