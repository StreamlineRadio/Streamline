import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { _clearEventBusForTesting } from './renderer/src/modules/event-bus';

afterEach(() => {
	cleanup();
	_clearEventBusForTesting();
});
