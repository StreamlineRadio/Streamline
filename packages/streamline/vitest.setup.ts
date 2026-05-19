import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { _clearEventBusForTesting } from './renderer/src/modules/event-bus';
import { instanceStore } from './renderer/src/modules/instance-store.svelte';

if (typeof globalThis.ResizeObserver === 'undefined') {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}

if (typeof globalThis.requestIdleCallback === 'undefined') {
	(
		globalThis as unknown as { requestIdleCallback: (cb: () => void) => number }
	).requestIdleCallback = (cb: () => void) => setTimeout(cb, 0) as unknown as number;
	(globalThis as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback = (
		id: number
	) => clearTimeout(id);
}

afterEach(() => {
	cleanup();
	_clearEventBusForTesting();
	for (const id of [...instanceStore.all.keys()]) instanceStore.remove(id);
});
