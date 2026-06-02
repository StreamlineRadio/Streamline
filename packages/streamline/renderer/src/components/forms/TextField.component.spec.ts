import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TextField from './TextField.svelte';

describe('TextField', () => {
	it('renders label and text input', () => {
		const { getByText, container } = render(TextField, { label: 'Host', value: '' });
		expect(getByText('Host')).toBeTruthy();
		expect(container.querySelector('input[type="text"]')).toBeTruthy();
	});

	it('renders password input when type is password', () => {
		const { container } = render(TextField, { label: 'Password', value: '', type: 'password' });
		expect(container.querySelector('input[type="password"]')).toBeTruthy();
	});

	it('shows current value', () => {
		const { container } = render(TextField, { label: 'L', value: 'hello' });
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('hello');
	});

	it('applies mono class when mono prop set', () => {
		const { container } = render(TextField, { label: 'L', value: '', mono: true });
		expect(container.querySelector('input')!.className).toContain('font-mono');
	});

	it('applies mono class on password input when mono set', () => {
		const { container } = render(TextField, {
			label: 'L',
			value: '',
			type: 'password',
			mono: true
		});
		expect(container.querySelector('input[type="password"]')!.className).toContain('font-mono');
	});
});
