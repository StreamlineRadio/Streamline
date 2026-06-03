import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

import SampleRateField from './SampleRateField.svelte';

describe('SampleRateField', () => {
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
