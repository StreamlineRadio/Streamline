import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

const { mockLayoutStore } = vi.hoisted(() => ({
	mockLayoutStore: {
		active: {
			instances: [
				{ id: 'deck-a', moduleId: 'deck', title: 'Deck A', x: 0, y: 0 },
				{ id: 'queue-1', moduleId: 'queue', title: 'Queue', x: 100, y: 0 }
			]
		} as {
			instances: Array<{ id: string; moduleId: string; title: string; x: number; y: number }>;
		} | null
	}
}));

vi.mock('../../layout/store.svelte', () => ({ layoutStore: mockLayoutStore }));

import QueueSettingsModal from './QueueSettingsModal.svelte';

describe('QueueSettingsModal', () => {
	it('renders "Queue settings" title', () => {
		mockLayoutStore.active = {
			instances: [{ id: 'deck-a', moduleId: 'deck', title: 'Deck A', x: 0, y: 0 }]
		};
		const { getByText } = render(QueueSettingsModal, {
			linkedDeckIds: [],
			onToggleDeck: vi.fn(),
			onClose: vi.fn()
		});
		expect(getByText('Queue settings')).toBeTruthy();
	});

	it('shows deck options from layoutStore', () => {
		mockLayoutStore.active = {
			instances: [{ id: 'deck-a', moduleId: 'deck', title: 'Deck A', x: 0, y: 0 }]
		};
		const { getByText } = render(QueueSettingsModal, {
			linkedDeckIds: [],
			onToggleDeck: vi.fn(),
			onClose: vi.fn()
		});
		expect(getByText('Deck A')).toBeTruthy();
	});

	it('shows "No decks" message when no deck instances', () => {
		mockLayoutStore.active = { instances: [] };
		const { getByText } = render(QueueSettingsModal, {
			linkedDeckIds: [],
			onToggleDeck: vi.fn(),
			onClose: vi.fn()
		});
		expect(getByText('No decks in the active layout.')).toBeTruthy();
	});

	it('shows "No decks" when layoutStore.active is null', () => {
		mockLayoutStore.active = null;
		const { getByText } = render(QueueSettingsModal, {
			linkedDeckIds: [],
			onToggleDeck: vi.fn(),
			onClose: vi.fn()
		});
		expect(getByText('No decks in the active layout.')).toBeTruthy();
	});

	it('checks decks that are in linkedDeckIds', () => {
		mockLayoutStore.active = {
			instances: [{ id: 'deck-a', moduleId: 'deck', title: 'Deck A', x: 0, y: 0 }]
		};
		const { container } = render(QueueSettingsModal, {
			linkedDeckIds: ['deck-a'],
			onToggleDeck: vi.fn(),
			onClose: vi.fn()
		});
		const checkboxes = container.querySelectorAll(
			'input[type="checkbox"]'
		) as NodeListOf<HTMLInputElement>;
		expect(checkboxes.length).toBeGreaterThan(0);
		expect(checkboxes[0].checked).toBe(true);
	});

	it('calls onToggleDeck when checkbox changes', async () => {
		mockLayoutStore.active = {
			instances: [{ id: 'deck-a', moduleId: 'deck', title: 'Deck A', x: 0, y: 0 }]
		};
		const onToggleDeck = vi.fn();
		const { container } = render(QueueSettingsModal, {
			linkedDeckIds: [],
			onToggleDeck,
			onClose: vi.fn()
		});
		const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
		await fireEvent.change(checkbox, { target: { checked: true } });
		expect(onToggleDeck).toHaveBeenCalledWith('deck-a', true);
	});

	it('calls onClose when close button clicked', async () => {
		mockLayoutStore.active = { instances: [] };
		const onClose = vi.fn();
		const { getByTitle } = render(QueueSettingsModal, {
			linkedDeckIds: [],
			onToggleDeck: vi.fn(),
			onClose
		});
		await fireEvent.click(getByTitle('Close'));
		expect(onClose).toHaveBeenCalledOnce();
	});
});
