import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

import BitrateField from './BitrateField.svelte';

describe('BitrateField', () => {
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
