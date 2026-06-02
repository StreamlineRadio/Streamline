import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = {
	hotkeys: {
		list: vi.fn().mockResolvedValue([]),
		save: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined)
	}
};

vi.stubGlobal('window', { streamline: { api: apiMock } });

import { hotkeyStore } from './store.svelte';
import type { HotkeyBinding } from '@streamline/shared';

function makeBinding(id = 'h1'): HotkeyBinding {
	return { id, instanceId: 'inst-1', action: 'play', accelerator: 'F1' };
}

describe('hotkeyStore', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		apiMock.hotkeys.list.mockResolvedValue([]);
		await hotkeyStore.load();
	});

	it('load populates bindings from API', async () => {
		apiMock.hotkeys.list.mockResolvedValueOnce([makeBinding('h1'), makeBinding('h2')]);
		await hotkeyStore.load();
		expect(hotkeyStore.all).toHaveLength(2);
	});

	it('bind adds a new binding and calls API', async () => {
		const { conflict } = await hotkeyStore.bind(makeBinding('h1'));
		expect(conflict).toBeNull();
		expect(apiMock.hotkeys.save).toHaveBeenCalledWith(makeBinding('h1'));
		expect(hotkeyStore.all).toHaveLength(1);
	});

	it('bind updates existing binding with same id', async () => {
		await hotkeyStore.bind(makeBinding('h1'));
		const updated = { ...makeBinding('h1'), accelerator: 'F2' };
		await hotkeyStore.bind(updated);
		expect(hotkeyStore.all[0].accelerator).toBe('F2');
		expect(hotkeyStore.all).toHaveLength(1);
	});

	it('bind returns conflict when same accelerator used by different binding', async () => {
		await hotkeyStore.bind(makeBinding('h1'));
		const conflicting = { id: 'h2', instanceId: 'inst-1', action: 'pause', accelerator: 'F1' };
		const { conflict } = await hotkeyStore.bind(conflicting);
		expect(conflict).toEqual(makeBinding('h1'));
	});

	it('unbind removes binding and calls API', async () => {
		await hotkeyStore.bind(makeBinding('h1'));
		await hotkeyStore.unbind('h1');
		expect(apiMock.hotkeys.delete).toHaveBeenCalledWith('h1');
		expect(hotkeyStore.all).toHaveLength(0);
	});
});
