import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import NumberField from './NumberField.svelte';

describe('NumberField', () => {
	it('renders label and input', () => {
		const { getByText, container } = render(NumberField, { label: 'Port', value: 8080 });
		expect(getByText('Port')).toBeTruthy();
		expect(container.querySelector('input')).toBeTruthy();
	});

	it('shows current value', () => {
		const { container } = render(NumberField, { label: 'L', value: 42 });
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('42');
	});

	it('renders unit suffix when provided', () => {
		const { getByText } = render(NumberField, { label: 'L', value: 10, unit: 'ms' });
		expect(getByText('ms')).toBeTruthy();
	});

	it('clamps to min on input', async () => {
		const { container } = render(NumberField, { label: 'L', value: 50, min: 10 });
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '2' } });
		expect(input.value).toBe('2');
	});

	it('snaps back to valid value on blur when NaN', async () => {
		const { container } = render(NumberField, { label: 'L', value: 5 });
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'abc' } });
		await fireEvent.blur(input);
		expect(input.value).toBe('5');
	});
});
