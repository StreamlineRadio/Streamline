import { hotkeyStore } from './store.svelte';
import { eventBus } from '../modules/event-bus';

function normalizeKey(event: KeyboardEvent): string {
	const parts: string[] = [];
	if (event.ctrlKey) parts.push('Ctrl');
	if (event.altKey) parts.push('Alt');
	if (event.shiftKey) parts.push('Shift');
	if (event.metaKey) parts.push('Meta');
	const key = event.code.replace(/^Key/, '').replace(/^Digit/, '');
	if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) parts.push(key);
	return parts.join('+');
}

export function initHotkeyBinder(): () => void {
	function onKeyDown(event: KeyboardEvent) {
		const accelerator = normalizeKey(event);
		const binding = hotkeyStore.all.find((b) => b.accelerator === accelerator);
		if (!binding) return;
		event.preventDefault();
		eventBus.emit(`${binding.instanceId}:${binding.action}`, null);
	}

	window.addEventListener('keydown', onKeyDown);
	return () => window.removeEventListener('keydown', onKeyDown);
}
