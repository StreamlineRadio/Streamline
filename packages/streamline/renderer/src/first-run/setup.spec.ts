import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = {
	settings: {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue(undefined)
	},
	layout: {
		save: vi.fn().mockResolvedValue(undefined)
	}
};
vi.stubGlobal('window', { streamline: { api: apiMock } });

const { buildDefaultLayoutMock, defaultLayout } = vi.hoisted(() => {
	const layout = {
		id: 'L1',
		name: 'Default',
		isActive: true,
		createdAt: 0,
		updatedAt: 0,
		instances: [
			{
				id: 'inst-deck-a',
				moduleId: 'deck',
				title: 'A',
				layoutId: 'L1',
				x: 0,
				y: 0,
				width: 400,
				height: 300,
				zIndex: 1,
				minimized: false,
				settingsJson: '{}'
			}
		]
	};
	return { buildDefaultLayoutMock: vi.fn().mockReturnValue(layout), defaultLayout: layout };
});
vi.mock('./default-layout', () => ({ buildDefaultLayout: buildDefaultLayoutMock }));

const { layoutStoreMock, instanceStoreMock, hotkeyStoreMock } = vi.hoisted(() => ({
	layoutStoreMock: { set: vi.fn() },
	instanceStoreMock: { add: vi.fn() },
	hotkeyStoreMock: { bind: vi.fn().mockResolvedValue({ conflict: null }) }
}));
vi.mock('../layout/store.svelte', () => ({ layoutStore: layoutStoreMock }));
vi.mock('../modules/instance-store.svelte', () => ({ instanceStore: instanceStoreMock }));
vi.mock('../hotkeys/store.svelte', () => ({ hotkeyStore: hotkeyStoreMock }));

import { maybeRunFirstRun, seedDefaultHotkeys } from './setup';
import type { Layout } from '@streamline/shared';

describe('maybeRunFirstRun', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		apiMock.settings.get.mockResolvedValue(null);
		buildDefaultLayoutMock.mockReturnValue(defaultLayout);
	});

	it('does nothing when firstRunComplete is already set', async () => {
		apiMock.settings.get.mockResolvedValueOnce('1');
		await maybeRunFirstRun();
		expect(apiMock.layout.save).not.toHaveBeenCalled();
	});

	it('builds and saves default layout on first run', async () => {
		await maybeRunFirstRun();
		expect(apiMock.layout.save).toHaveBeenCalledOnce();
		expect(apiMock.settings.set).toHaveBeenCalledWith('firstRunComplete', '1');
		expect(layoutStoreMock.set).toHaveBeenCalledOnce();
	});

	it('adds all instances to instanceStore', async () => {
		await maybeRunFirstRun();
		expect(instanceStoreMock.add).toHaveBeenCalledTimes(defaultLayout.instances.length);
	});
});

describe('seedDefaultHotkeys', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		hotkeyStoreMock.bind.mockResolvedValue({ conflict: null });
	});

	it('binds hotkeys for deck A, B, queue, and mic found in layout', async () => {
		const layout: Layout = {
			id: 'L1',
			name: 'Test',
			isActive: true,
			createdAt: 0,
			updatedAt: 0,
			instances: [
				{
					id: 'da',
					moduleId: 'deck',
					title: 'A',
					layoutId: 'L1',
					x: 0,
					y: 0,
					width: 400,
					height: 300,
					zIndex: 1,
					minimized: false,
					settingsJson: '{}'
				},
				{
					id: 'db',
					moduleId: 'deck',
					title: 'B',
					layoutId: 'L1',
					x: 0,
					y: 0,
					width: 400,
					height: 300,
					zIndex: 1,
					minimized: false,
					settingsJson: '{}'
				},
				{
					id: 'q1',
					moduleId: 'queue',
					title: 'Q',
					layoutId: 'L1',
					x: 0,
					y: 0,
					width: 400,
					height: 300,
					zIndex: 1,
					minimized: false,
					settingsJson: '{}'
				},
				{
					id: 'm1',
					moduleId: 'microphone',
					title: 'Mic',
					layoutId: 'L1',
					x: 0,
					y: 0,
					width: 400,
					height: 300,
					zIndex: 1,
					minimized: false,
					settingsJson: '{}'
				}
			]
		};
		await seedDefaultHotkeys(layout);
		expect(hotkeyStoreMock.bind).toHaveBeenCalledTimes(6);
	});

	it('skips missing modules', async () => {
		const layout: Layout = {
			id: 'L1',
			name: 'Test',
			isActive: true,
			createdAt: 0,
			updatedAt: 0,
			instances: []
		};
		await seedDefaultHotkeys(layout);
		expect(hotkeyStoreMock.bind).not.toHaveBeenCalled();
	});
});
