import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

import BitrateField from './BitrateField.svelte';

describe('BitrateField', () => {
	it('updates the bound value when an option is picked', async () => {
		const { container } = render(BitrateField, { label: 'Bitrate', value: 128 });
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.focus(input);
		const option = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('192')
		) as HTMLButtonElement;
		expect(option).toBeTruthy();
		await fireEvent.click(option);
		expect(input.value).toBe('192');
	});

	it('renders label', () => {
		const { getByText } = render(BitrateField, { label: 'Bitrate', value: 128 });
		expect(getByText('Bitrate')).toBeTruthy();
	});

	it('shows kbps suffix', () => {
		const { getByText } = render(BitrateField, { label: 'L', value: 128 });
		expect(getByText('kbps')).toBeTruthy();
	});

	it('shows current bitrate value', () => {
		const { container } = render(BitrateField, { label: 'L', value: 192 });
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('192');
	});
});
