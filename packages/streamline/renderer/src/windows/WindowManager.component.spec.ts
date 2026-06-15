import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';

const { allMapMock } = vi.hoisted(() => ({
	allMapMock: new Map()
}));

vi.mock('../modules/instance-store.svelte', () => ({
	instanceStore: {
		all: allMapMock,
		add: vi.fn(),
		get: vi.fn((id: string) => allMapMock.get(id)),
		update: vi.fn(),
		bringToFront: vi.fn()
	}
}));

vi.mock('./use-interact', () => ({
	useInteract: vi.fn().mockReturnValue({ destroy: vi.fn() })
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

import WindowManager from './WindowManager.svelte';

describe('WindowManager', () => {
	beforeEach(() => {
		allMapMock.clear();
		(window as unknown as Record<string, unknown>).streamline = {
			api: {
				layout: {
					list: vi.fn().mockResolvedValue([]),
					load: vi.fn().mockResolvedValue(null)
				}
			}
		};
	});

	afterEach(() => {
		delete (window as unknown as Record<string, unknown>).streamline;
	});

	it('renders a window wrapper for window-kind module instances', async () => {
		const { getModule } = await import('../modules/registry');
		const fakeUi = vi.fn();
		vi.mocked(getModule).mockReturnValue({
			id: 'fake',
			kind: 'window',
			displayName: 'Fake Module',
			minWidth: 100,
			minHeight: 80,
			ui: fakeUi
		} as unknown as ReturnType<typeof getModule>);
		allMapMock.set('w1', {
			record: {
				id: 'w1',
				moduleId: 'fake',
				title: 'Win',
				x: 0,
				y: 0,
				width: 200,
				height: 150,
				zIndex: 1,
				minimized: false
			}
		});
		try {
			const { getByRole } = render(WindowManager);
			expect(getByRole('region')).toBeTruthy();
			expect(fakeUi).toHaveBeenCalled();
		} finally {
			vi.mocked(getModule).mockReturnValue(undefined);
			allMapMock.clear();
		}
	});

	it('skips instances whose module is not a window module', async () => {
		allMapMock.set('h1', {
			record: {
				id: 'h1',
				moduleId: 'unknown',
				title: '',
				x: 0,
				y: 0,
				width: 10,
				height: 10,
				zIndex: 1,
				minimized: false
			}
		});
		try {
			const { container } = render(WindowManager);
			expect(container.querySelector('[role="region"]')).toBeNull();
		} finally {
			allMapMock.clear();
		}
	});

	it('renders without crashing when instanceStore is empty', () => {
		const { container } = render(WindowManager);
		expect(container.querySelector('div.absolute')).toBeTruthy();
	});

	it('renders wrapper container', () => {
		const { container } = render(WindowManager);
		const root = container.firstElementChild;
		expect(root?.className).toContain('absolute');
	});
});
