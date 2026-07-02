import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Toast from './Toast.svelte';

describe('Toast', () => {
	it('renders the message', () => {
		const { getByText } = render(Toast, {
			message: 'Something went wrong',
			type: 'error',
			onClose: vi.fn()
		});
		expect(getByText('Something went wrong')).toBeTruthy();
	});

	it('calls onClose when close button clicked', async () => {
		const onClose = vi.fn();
		const { getByRole } = render(Toast, { message: 'Test', type: 'info', onClose });
		await fireEvent.click(getByRole('button'));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('applies danger surface for error type', () => {
		const { container } = render(Toast, { message: 'Err', type: 'error', onClose: vi.fn() });
		expect(container.querySelector('.bg-danger-950')).toBeTruthy();
	});

	it('applies warning surface for warning type', () => {
		const { container } = render(Toast, { message: 'Warn', type: 'warning', onClose: vi.fn() });
		expect(container.querySelector('.bg-warning-950')).toBeTruthy();
	});

	it('applies info surface for info type', () => {
		const { container } = render(Toast, { message: 'Info', type: 'info', onClose: vi.fn() });
		expect(container.querySelector('.bg-info-950')).toBeTruthy();
	});

	it('applies success surface for success type', () => {
		const { container } = render(Toast, { message: 'Done', type: 'success', onClose: vi.fn() });
		expect(container.querySelector('.bg-success-950')).toBeTruthy();
	});
});
