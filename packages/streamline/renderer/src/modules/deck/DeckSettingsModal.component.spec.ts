import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

import DeckSettingsModal from './DeckSettingsModal.svelte';

describe('DeckSettingsModal', () => {
	it('renders title', () => {
		const { getByText } = render(DeckSettingsModal, {
			sendMetadata: false,
			onChange: vi.fn(),
			onClose: vi.fn()
		});
		expect(getByText('Deck settings')).toBeTruthy();
	});

	it('checkbox reflects sendMetadata false', () => {
		const { container } = render(DeckSettingsModal, {
			sendMetadata: false,
			onChange: vi.fn(),
			onClose: vi.fn()
		});
		const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
		expect(checkbox).toBeTruthy();
		expect(checkbox.checked).toBe(false);
	});

	it('checkbox reflects sendMetadata true', () => {
		const { container } = render(DeckSettingsModal, {
			sendMetadata: true,
			onChange: vi.fn(),
			onClose: vi.fn()
		});
		const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
		expect(checkbox).toBeTruthy();
		expect(checkbox.checked).toBe(true);
	});

	it('calls onChange with toggled value on checkbox change', async () => {
		const onChange = vi.fn();
		const { container } = render(DeckSettingsModal, {
			sendMetadata: false,
			onChange,
			onClose: vi.fn()
		});
		await fireEvent.change(container.querySelector('input[type="checkbox"]')!, {
			target: { checked: true }
		});
		expect(onChange).toHaveBeenCalledWith({ sendMetadata: true });
	});

	it('calls onClose when close button clicked', async () => {
		const onClose = vi.fn();
		const { getByTitle } = render(DeckSettingsModal, {
			sendMetadata: false,
			onChange: vi.fn(),
			onClose
		});
		await fireEvent.click(getByTitle('Close'));
		expect(onClose).toHaveBeenCalledOnce();
	});
});
