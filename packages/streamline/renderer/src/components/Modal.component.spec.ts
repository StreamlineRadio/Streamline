import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({
	FontAwesomeIcon: vi.fn()
}));

import Modal from './Modal.svelte';

const childrenSnippet = createRawSnippet(() => ({ render: () => '<span>modal body</span>' }));
const actionsSnippet = createRawSnippet(() => ({ render: () => '<button>OK</button>' }));

describe('Modal', () => {
	it('renders the title', () => {
		const { getByText } = render(Modal, {
			title: 'Settings',
			onClose: vi.fn(),
			children: childrenSnippet
		});
		expect(getByText('Settings')).toBeTruthy();
	});

	it('renders children snippet', () => {
		const { getByText } = render(Modal, {
			title: 'T',
			onClose: vi.fn(),
			children: childrenSnippet
		});
		expect(getByText('modal body')).toBeTruthy();
	});

	it('calls onClose when close button clicked', async () => {
		const onClose = vi.fn();
		const { getByTitle } = render(Modal, { title: 'T', onClose, children: childrenSnippet });
		await fireEvent.click(getByTitle('Close'));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('calls onClose on Escape key', async () => {
		const onClose = vi.fn();
		render(Modal, { title: 'T', onClose, children: childrenSnippet });
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('renders eyebrow when provided', () => {
		const { getByText } = render(Modal, {
			title: 'T',
			eyebrow: 'SETTINGS',
			onClose: vi.fn(),
			children: childrenSnippet
		});
		expect(getByText('SETTINGS')).toBeTruthy();
	});

	it('renders actions snippet when provided', () => {
		const { getByText } = render(Modal, {
			title: 'T',
			onClose: vi.fn(),
			children: childrenSnippet,
			actions: actionsSnippet
		});
		expect(getByText('OK')).toBeTruthy();
	});

	it('does not call onClose for non-Escape key', async () => {
		const onClose = vi.fn();
		render(Modal, { title: 'T', onClose, children: childrenSnippet });
		await fireEvent.keyDown(window, { key: 'Enter' });
		expect(onClose).not.toHaveBeenCalled();
	});
});
