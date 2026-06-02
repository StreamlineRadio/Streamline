import { describe, it, expect, vi } from 'vitest';
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

import WindowWrapper from './WindowWrapper.svelte';

const childrenSnippet = createRawSnippet(() => ({ render: () => '<span>content</span>' }));

describe('WindowWrapper', () => {
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
