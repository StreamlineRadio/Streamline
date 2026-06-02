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

	it('applies error class for error type', () => {
		const { container } = render(Toast, { message: 'Err', type: 'error', onClose: vi.fn() });
		expect(container.querySelector('.bg-red-900')).toBeTruthy();
	});

	it('applies warning class for warning type', () => {
		const { container } = render(Toast, { message: 'Warn', type: 'warning', onClose: vi.fn() });
		expect(container.querySelector('.bg-yellow-900')).toBeTruthy();
	});

	it('applies info class for info type', () => {
		const { container } = render(Toast, { message: 'Info', type: 'info', onClose: vi.fn() });
		expect(container.querySelector('.bg-blue-900')).toBeTruthy();
	});
});
