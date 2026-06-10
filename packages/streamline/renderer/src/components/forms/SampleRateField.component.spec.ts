import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

import SampleRateField from './SampleRateField.svelte';

describe('SampleRateField', () => {
	it('updates the bound value when an option is picked', async () => {
		const { container } = render(SampleRateField, { label: 'Rate', value: 44100 });
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.focus(input);
		const option = [...container.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('48.0')
		) as HTMLButtonElement;
		expect(option).toBeTruthy();
		await fireEvent.click(option);
		expect(input.value).toBe('48.0');
	});

	it('renders label', () => {
		const { getByText } = render(SampleRateField, { label: 'Sample Rate', value: 44100 });
		expect(getByText('Sample Rate')).toBeTruthy();
	});

	it('shows kHz suffix', () => {
		const { getByText } = render(SampleRateField, { label: 'L', value: 44100 });
		expect(getByText('kHz')).toBeTruthy();
	});

	it('formats 44100 as 44.1', () => {
		const { container } = render(SampleRateField, { label: 'L', value: 44100 });
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('44.1');
	});

	it('formats 48000 as 48.0', () => {
		const { container } = render(SampleRateField, { label: 'L', value: 48000 });
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('48.0');
	});
});
