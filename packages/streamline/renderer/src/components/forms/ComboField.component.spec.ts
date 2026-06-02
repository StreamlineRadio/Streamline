import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

import ComboField from './ComboField.svelte';

describe('ComboField', () => {
	it('renders label and input', () => {
		const { getByText, container } = render(ComboField, {
			label: 'Bitrate',
			value: 128,
			options: [64, 128, 256]
		});
		expect(getByText('Bitrate')).toBeTruthy();
		expect(container.querySelector('input')).toBeTruthy();
	});

	it('shows current value in input', () => {
		const { container } = render(ComboField, { label: 'L', value: 256, options: [128, 256] });
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('256');
	});

	it('renders suffix when provided', () => {
		const { getByText } = render(ComboField, {
			label: 'L',
			value: 128,
			options: [128],
			suffix: 'kbps'
		});
		expect(getByText('kbps')).toBeTruthy();
	});

	it('opens dropdown on focus', async () => {
		const { container } = render(ComboField, { label: 'L', value: 128, options: [64, 128, 256] });
		await fireEvent.focus(container.querySelector('input')!);
		await tick();
		expect(container.querySelectorAll('button[type="button"]').length).toBeGreaterThan(1);
	});

	it('selects option on click and closes dropdown', async () => {
		const { container } = render(ComboField, { label: 'L', value: 128, options: [64, 128, 256] });
		await fireEvent.focus(container.querySelector('input')!);
		await tick();
		const optionButtons = container.querySelectorAll(
			'div.absolute button'
		) as NodeListOf<HTMLButtonElement>;
		await fireEvent.click(optionButtons[0]);
		await tick();
		expect((container.querySelector('input') as HTMLInputElement).value).toBe('64');
	});

	it('closes dropdown on Escape key', async () => {
		const { container } = render(ComboField, { label: 'L', value: 128, options: [64, 128, 256] });
		await fireEvent.focus(container.querySelector('input')!);
		await tick();
		await fireEvent.keyDown(container.querySelector('input')!, { key: 'Escape' });
		await tick();
		const dropdownButtons = container.querySelectorAll('div.absolute button');
		expect(dropdownButtons.length).toBe(0);
	});

	it('snaps back to formatted value on blur with invalid input', async () => {
		const { container } = render(ComboField, { label: 'L', value: 128, options: [128] });
		const input = container.querySelector('input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: 'xyz' } });
		await fireEvent.blur(input);
		await tick();
		expect(input.value).toBe('128');
	});

	it('toggles dropdown on chevron button click', async () => {
		const { container } = render(ComboField, { label: 'L', value: 128, options: [64, 128] });
		const toggleBtn = container.querySelector(
			'button[aria-label="Toggle options"]'
		) as HTMLButtonElement;
		await fireEvent.click(toggleBtn);
		await tick();
		const dropdownBtns = container.querySelectorAll('div.absolute button');
		expect(dropdownBtns.length).toBeGreaterThan(0);
		await fireEvent.click(toggleBtn);
		await tick();
		expect(container.querySelectorAll('div.absolute button').length).toBe(0);
	});

	it('closes dropdown on mousedown outside wrapper', async () => {
		const { container } = render(ComboField, { label: 'L', value: 128, options: [64, 128] });
		await fireEvent.focus(container.querySelector('input')!);
		await tick();
		await fireEvent.mouseDown(document.body);
		await tick();
		expect(container.querySelectorAll('div.absolute button').length).toBe(0);
	});
});
