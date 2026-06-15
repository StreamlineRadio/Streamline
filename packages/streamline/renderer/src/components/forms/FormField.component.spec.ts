import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import FormField from './FormField.svelte';

const childrenSnippet = createRawSnippet(() => ({ render: () => '<input type="text" />' }));

describe('FormField', () => {
	it('renders label text', () => {
		const { getByText } = render(FormField, { label: 'Server URL', children: childrenSnippet });
		expect(getByText('Server URL')).toBeTruthy();
	});

	it('renders children snippet', () => {
		const { container } = render(FormField, { label: 'L', children: childrenSnippet });
		expect(container.querySelector('input')).toBeTruthy();
	});
});
