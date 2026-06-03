import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import FilenameField from './FilenameField.svelte';

describe('FilenameField', () => {
	it('renders label', () => {
		const { getByText } = render(FilenameField, {
			label: 'Filename',
			value: 'recording',
			extension: 'mp3'
		});
		expect(getByText('Filename')).toBeTruthy();
	});

	it('shows extension suffix', () => {
		const { getByText } = render(FilenameField, { label: 'L', value: '', extension: 'flac' });
		expect(getByText('.flac')).toBeTruthy();
	});

	it('shows current value in input', () => {
		const { container } = render(FilenameField, { label: 'L', value: 'session', extension: 'ogg' });
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('session');
	});
});
