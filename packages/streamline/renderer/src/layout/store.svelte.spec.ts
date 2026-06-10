import { describe, it, expect, beforeEach } from 'vitest';
import { layoutStore } from './store.svelte';
import type { Layout } from '@streamline/shared';

function makeLayout(id = 'L1'): Layout {
	return {
		id,
		name: 'Main',
		isActive: true,
		createdAt: 0,
		updatedAt: 0,
		instances: [
			{
				id: 'inst-1',
				layoutId: id,
				moduleId: 'deck',
				title: 'A',
				x: 10,
				y: 20,
				width: 400,
				height: 300,
				zIndex: 1,
				minimized: false,
				settingsJson: '{}'
			}
		]
	};
}

describe('layoutStore', () => {
	beforeEach(() => {
		layoutStore.set(null as unknown as Layout);
	});

	it('active is null initially (after reset)', () => {
		expect(layoutStore.active).toBeNull();
	});

	it('set updates active layout', () => {
		layoutStore.set(makeLayout());
		expect(layoutStore.active?.id).toBe('L1');
	});

	it('updateInstance patches a matching instance', () => {
		layoutStore.set(makeLayout());
		layoutStore.updateInstance('inst-1', { x: 99, title: 'B' });
		expect(layoutStore.active?.instances[0].x).toBe(99);
		expect(layoutStore.active?.instances[0].title).toBe('B');
	});

	it('updateInstance is a no-op when active layout is null', () => {
		expect(() => layoutStore.updateInstance('inst-1', { x: 99 })).not.toThrow();
	});

	it('updateInstance does not mutate non-matching instances', () => {
		layoutStore.set(makeLayout());
		layoutStore.updateInstance('inst-99', { x: 99 });
		expect(layoutStore.active?.instances[0].x).toBe(10);
	});
});
