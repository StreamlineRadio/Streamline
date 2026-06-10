import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import SelectField from './SelectField.svelte';

const optionsSnippet = createRawSnippet(() => ({
	render: () => '<option value="mp3">MP3</option><option value="aac">AAC</option>'
}));

describe('SelectField', () => {
	it('renders label', () => {
		const { getByText } = render(SelectField, {
			label: 'Format',
			value: 'mp3',
			children: optionsSnippet
		});
		expect(getByText('Format')).toBeTruthy();
	});

	it('renders select element', () => {
		const { container } = render(SelectField, {
			label: 'Format',
			value: 'mp3',
			children: optionsSnippet
		});
		expect(container.querySelector('select')).toBeTruthy();
	});
});
