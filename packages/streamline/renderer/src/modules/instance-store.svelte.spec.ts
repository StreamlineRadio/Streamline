import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createModuleContextMock } = vi.hoisted(() => ({
	createModuleContextMock: vi.fn().mockImplementation((instanceId: string, moduleId: string) => ({
		instanceId,
		moduleId,
		emit: vi.fn(),
		on: vi.fn(),
		log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
	}))
}));
vi.mock('./context', () => ({ createModuleContext: createModuleContextMock }));

import { instanceStore } from './instance-store.svelte';
import type { ModuleInstanceRecord } from '@streamline/shared';

function makeRecord(id = 'inst-1'): ModuleInstanceRecord {
	return {
		id,
		layoutId: 'L1',
		moduleId: 'deck',
		title: 'A',
		x: 0,
		y: 0,
		width: 400,
		height: 300,
		zIndex: 1,
		minimized: false,
		settingsJson: '{}'
	};
}

describe('instanceStore', () => {
	beforeEach(() => {
		for (const id of [...instanceStore.all.keys()]) instanceStore.remove(id);
		vi.clearAllMocks();
	});

	it('add creates a context and stores the record', () => {
		instanceStore.add(makeRecord());
		expect(instanceStore.all.size).toBe(1);
		expect(instanceStore.get('inst-1')?.context).toBeDefined();
	});

	it('get returns undefined for unknown id', () => {
		expect(instanceStore.get('unknown')).toBeUndefined();
	});

	it('get returns the active instance', () => {
		instanceStore.add(makeRecord());
		expect(instanceStore.get('inst-1')).toBeDefined();
		expect(instanceStore.get('inst-1')!.record.moduleId).toBe('deck');
	});

	it('update patches the record', () => {
		instanceStore.add(makeRecord());
		instanceStore.update('inst-1', { title: 'B', x: 100 });
		expect(instanceStore.get('inst-1')!.record.title).toBe('B');
		expect(instanceStore.get('inst-1')!.record.x).toBe(100);
	});

	it('update is a no-op for unknown id', () => {
		expect(() => instanceStore.update('unknown', { title: 'B' })).not.toThrow();
	});

	it('remove deletes the instance', () => {
		instanceStore.add(makeRecord());
		instanceStore.remove('inst-1');
		expect(instanceStore.all.size).toBe(0);
	});

	it('bringToFront increments zIndex above all others', () => {
		instanceStore.add(makeRecord('a'));
		instanceStore.add({ ...makeRecord('b'), zIndex: 5 });
		instanceStore.bringToFront('a');
		expect(instanceStore.get('a')!.record.zIndex).toBe(6);
	});

	it('bringToFront is a no-op for unknown id', () => {
		expect(() => instanceStore.bringToFront('unknown')).not.toThrow();
	});
});
