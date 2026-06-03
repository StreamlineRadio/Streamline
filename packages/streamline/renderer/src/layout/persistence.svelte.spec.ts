import { describe, it, expect } from 'vitest';
import { startLayoutPersistence } from './persistence.svelte';

describe('startLayoutPersistence', () => {
	it('can be imported and does not throw outside component context', () => {
		// $effect is a no-op outside Svelte component tree
		expect(() => startLayoutPersistence()).not.toThrow();
	});
});
