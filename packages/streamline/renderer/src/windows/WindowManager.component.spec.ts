import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';

const { allMapMock } = vi.hoisted(() => ({
	allMapMock: new Map()
}));

vi.mock('../modules/instance-store.svelte', () => ({
	instanceStore: {
		all: allMapMock,
		add: vi.fn()
	}
}));

vi.mock('../layout/store.svelte', () => ({
	layoutStore: {
		set: vi.fn(),
		updateInstance: vi.fn()
	}
}));

vi.mock('../layout/persistence.svelte', () => ({
	startLayoutPersistence: vi.fn()
}));

vi.mock('../modules/registry', () => ({
	getModule: vi.fn().mockReturnValue(null)
}));

vi.mock('./WindowWrapper.svelte', () => ({ default: vi.fn() }));

import WindowManager from './WindowManager.svelte';

describe('WindowManager', () => {
	it('renders without crashing when instanceStore is empty', () => {
		allMapMock.clear();
		(window as unknown as Record<string, unknown>).streamline = {
			api: {
				layout: {
					list: vi.fn().mockResolvedValue([]),
					load: vi.fn().mockResolvedValue(null)
				}
			}
		};
		const { container } = render(WindowManager);
		expect(container.querySelector('div.absolute')).toBeTruthy();
		delete (window as unknown as Record<string, unknown>).streamline;
	});

	it('renders wrapper container', () => {
		allMapMock.clear();
		(window as unknown as Record<string, unknown>).streamline = {
			api: {
				layout: {
					list: vi.fn().mockResolvedValue([]),
					load: vi.fn().mockResolvedValue(null)
				}
			}
		};
		const { container } = render(WindowManager);
		const root = container.firstElementChild;
		expect(root?.className).toContain('absolute');
		delete (window as unknown as Record<string, unknown>).streamline;
	});
});
