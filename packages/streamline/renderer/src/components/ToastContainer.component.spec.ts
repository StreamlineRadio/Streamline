import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { eventBus, _clearEventBusForTesting } from '../modules/event-bus';
import ToastContainer from './ToastContainer.svelte';

describe('ToastContainer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		_clearEventBusForTesting();
	});

	afterEach(() => {
		vi.useRealTimers();
		_clearEventBusForTesting();
	});

	it('renders with no toasts initially', () => {
		const { container } = render(ToastContainer);
		expect(container.querySelectorAll('.flex-1').length).toBe(0);
	});

	it('shows toast after addToast call', async () => {
		const { component, getByText } = render(ToastContainer);
		(component as unknown as { addToast: (m: string, t: string) => void }).addToast(
			'Hello',
			'info'
		);
		await tick();
		expect(getByText('Hello')).toBeTruthy();
	});

	it('removes toast after duration elapses', async () => {
		const { component, queryByText } = render(ToastContainer);
		(component as unknown as { addToast: (m: string, t: string, d: number) => void }).addToast(
			'Bye',
			'info',
			1000
		);
		await tick();
		vi.advanceTimersByTime(1001);
		await tick();
		expect(queryByText('Bye')).toBeNull();
	});

	it('shows toast when toast:show event fires', async () => {
		const { getByText } = render(ToastContainer);
		await tick();
		eventBus.emit('toast:show', { message: 'Event toast', type: 'error' });
		await tick();
		expect(getByText('Event toast')).toBeTruthy();
	});

	it('defaults to info type when toast:show event has no type', async () => {
		const { getByText } = render(ToastContainer);
		await tick();
		eventBus.emit('toast:show', { message: 'Default type toast' });
		await tick();
		expect(getByText('Default type toast')).toBeTruthy();
	});

	it('removes toast when close button clicked', async () => {
		const { component, getByRole, queryByText } = render(ToastContainer);
		(component as unknown as { addToast: (m: string, t: string) => void }).addToast(
			'Closeable',
			'info'
		);
		await tick();
		const closeButton = getByRole('button');
		closeButton.click();
		await tick();
		expect(queryByText('Closeable')).toBeNull();
	});
});
