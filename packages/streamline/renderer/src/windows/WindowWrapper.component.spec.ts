import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { tick } from 'svelte';

const { updateMock, bringToFrontMock, updateInstanceMock } = vi.hoisted(() => ({
	updateMock: vi.fn(),
	bringToFrontMock: vi.fn(),
	updateInstanceMock: vi.fn()
}));

vi.mock('./use-interact', () => ({
	useInteract: vi.fn().mockReturnValue({ destroy: vi.fn() })
}));

vi.mock('../modules/instance-store.svelte', () => ({
	instanceStore: {
		get: vi.fn().mockReturnValue({
			record: {
				id: 'inst-1',
				x: 10,
				y: 20,
				width: 300,
				height: 200,
				zIndex: 1,
				title: 'Deck A',
				minimized: false,
				moduleId: 'deck'
			}
		}),
		update: updateMock,
		bringToFront: bringToFrontMock
	}
}));

vi.mock('../layout/store.svelte', () => ({
	layoutStore: { updateInstance: updateInstanceMock }
}));

import { instanceStore } from '../modules/instance-store.svelte';
import WindowWrapper from './WindowWrapper.svelte';

const childrenSnippet = createRawSnippet(() => ({ render: () => '<span>content</span>' }));

describe('WindowWrapper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders module display name', () => {
		const { getByText } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		expect(getByText('Deck')).toBeTruthy();
	});

	it('renders instance title', () => {
		const { getByText } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		expect(getByText('Deck A')).toBeTruthy();
	});

	it('renders children snippet', () => {
		const { getByText } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		expect(getByText('content')).toBeTruthy();
	});

	it('calls bringToFront on pointerdown', async () => {
		const { getByRole } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		await fireEvent.pointerDown(getByRole('region'));
		expect(bringToFrontMock).toHaveBeenCalledWith('inst-1');
	});

	it('toggles minimize on minimize button click', async () => {
		const { getByRole } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		await fireEvent.click(getByRole('button', { name: 'Minimize' }));
		expect(updateMock).toHaveBeenCalledWith('inst-1', { minimized: true });
	});

	it('omits the title separator when the record title is empty', () => {
		const defaultRecord = instanceStore.get('inst-1');
		vi.mocked(instanceStore.get).mockReturnValue({
			record: {
				id: 'inst-1',
				x: 10,
				y: 20,
				width: 300,
				height: 200,
				zIndex: 1,
				title: '',
				minimized: false,
				moduleId: 'deck'
			}
		} as unknown as ReturnType<typeof instanceStore.get>);
		try {
			const { container } = render(WindowWrapper, {
				instanceId: 'inst-1',
				moduleDisplayName: 'Deck',
				children: childrenSnippet
			});
			expect(container.textContent).not.toContain(':');
		} finally {
			vi.mocked(instanceStore.get).mockReturnValue(defaultRecord);
		}
	});

	it('applies min-width and min-height styles when provided', () => {
		const { getByRole } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			minWidth: 240,
			minHeight: 120,
			children: childrenSnippet
		});
		const region = getByRole('region');
		expect(region.style.minWidth).toBe('240px');
		expect(region.style.minHeight).toBe('120px');
	});

	it('renames the window via double-click, typing, and Enter', async () => {
		const { container, getByText } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		await fireEvent.dblClick(getByText('Deck A'));
		const input = container.querySelector('input') as HTMLInputElement;
		expect(input).toBeTruthy();
		await fireEvent.input(input, { target: { value: 'Renamed' } });
		await fireEvent.keyDown(input, { key: 'a' });
		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(updateMock).toHaveBeenCalledWith('inst-1', { title: 'Renamed' });
	});

	it('commits a rename when the input loses focus', async () => {
		const { container, getByText } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		await fireEvent.dblClick(getByText('Deck A'));
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.blur(input);
		expect(updateMock).toHaveBeenCalledWith('inst-1', { title: 'Deck A' });
	});

	it('renders nothing when the instance record is missing', () => {
		const defaultRecord = instanceStore.get('inst-1');
		vi.mocked(instanceStore.get).mockReturnValue(undefined);
		try {
			const { container } = render(WindowWrapper, {
				instanceId: 'gone',
				moduleDisplayName: 'Deck',
				children: childrenSnippet
			});
			expect(container.querySelector('[role="region"]')).toBeNull();
		} finally {
			vi.mocked(instanceStore.get).mockReturnValue(defaultRecord);
		}
	});

	it('renders auto height when minimized', () => {
		const mockContext = {
			instanceId: 'inst-1',
			moduleId: 'deck',
			emit: vi.fn(),
			on: vi.fn().mockReturnValue(() => {}),
			log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
		};
		vi.mocked(instanceStore.get).mockReturnValueOnce({
			record: {
				id: 'inst-1',
				x: 10,
				y: 20,
				width: 300,
				height: 200,
				zIndex: 1,
				title: 'Deck A',
				minimized: true,
				moduleId: 'deck',
				layoutId: 'layout-1',
				settingsJson: '{}'
			},
			context: mockContext
		});
		const { container } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		const region = container.querySelector('[role="region"]') as HTMLElement;
		expect(region.style.height).toBe('auto');
	});

	it('renders nothing when record is undefined', () => {
		vi.mocked(instanceStore.get).mockReturnValueOnce(undefined as never);
		const { container } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		expect(container.querySelector('[role="region"]')).toBeNull();
	});

	it('applies min-width and min-height style when props provided', () => {
		const { container } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet,
			minWidth: 200,
			minHeight: 150
		});
		const region = container.querySelector('[role="region"]') as HTMLElement;
		const style = region.getAttribute('style') ?? '';
		expect(style).toContain('min-width: 200px');
		expect(style).toContain('min-height: 150px');
	});

	it('double-click on title starts rename', async () => {
		const { getByText, container } = render(WindowWrapper, {
			instanceId: 'inst-1',
			moduleDisplayName: 'Deck',
			children: childrenSnippet
		});
		const titleSpan = getByText('Deck A');
		await fireEvent.dblClick(titleSpan);
		await tick();
		expect(container.querySelector('input')).toBeTruthy();
	});
});
