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

afterEach(() => {
	cleanup();
	_clearEventBusForTesting();
	for (const id of [...instanceStore.all.keys()]) instanceStore.remove(id);
});
