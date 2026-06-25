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

// jsdom lacks the Web Animations API that Svelte 5 transitions use; a no-op
// stub keeps `in:`/`out:` transitions from throwing during component tests.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
	Element.prototype.animate = () =>
		({
			finished: Promise.resolve(),
			cancel() {},
			play() {},
			pause() {},
			finish() {},
			commitStyles() {},
			onfinish: null
		}) as unknown as Animation;
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
