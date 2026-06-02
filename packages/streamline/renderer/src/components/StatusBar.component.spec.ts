import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('StatusBar', () => {
	let encoderStatusCallback: (id: string, status: unknown) => void;

	beforeEach(() => {
		vi.useFakeTimers();
		(window as unknown as Record<string, unknown>).streamline = {
			onEncoderStatus: vi.fn((cb: (id: string, status: unknown) => void) => {
				encoderStatusCallback = cb;
			}),
			api: {
				system: {
					getAppVersion: vi.fn().mockResolvedValue('1.2.3'),
					getCpuUsage: vi.fn().mockResolvedValue(42)
				}
			}
		};
	});

	afterEach(() => {
		vi.useRealTimers();
		delete (window as unknown as Record<string, unknown>).streamline;
	});

	it('shows version after mount', async () => {
		const { getByText } = render((await import('./StatusBar.svelte')).default);
		await tick();
		await Promise.resolve();
		expect(getByText(/v1\.2\.3/)).toBeTruthy();
	});

	it('shows 0 encoders active initially', async () => {
		const { getByText } = render((await import('./StatusBar.svelte')).default);
		await tick();
		expect(getByText('0 encoders active')).toBeTruthy();
	});

	it('updates encoder count when onEncoderStatus fires', async () => {
		const { getByText } = render((await import('./StatusBar.svelte')).default);
		await tick();
		encoderStatusCallback('enc-1', { status: 'streaming' });
		await tick();
		expect(getByText('1 encoder active')).toBeTruthy();
	});

	it('shows error color when an encoder has error status', async () => {
		const { container } = render((await import('./StatusBar.svelte')).default);
		await tick();
		encoderStatusCallback('enc-1', { status: 'streaming' });
		encoderStatusCallback('enc-2', { status: 'error' });
		await tick();
		expect(container.querySelector('.text-red-500')).toBeTruthy();
	});

	it('updates CPU usage after interval tick', async () => {
		const { getByText } = render((await import('./StatusBar.svelte')).default);
		await tick();
		vi.advanceTimersByTime(1001);
		await tick();
		await Promise.resolve();
		expect(getByText('CPU: 42%')).toBeTruthy();
	});
});
