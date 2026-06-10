import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

describe('FolderField', () => {
	beforeEach(() => {
		(window as unknown as Record<string, unknown>).streamline = {
			api: {
				system: {
					selectFolder: vi.fn().mockResolvedValue('/chosen/path')
				}
			}
		};
	});

	afterEach(() => {
		delete (window as unknown as Record<string, unknown>).streamline;
	});

	it('keeps the current value when the picker is canceled', async () => {
		(
			window as unknown as {
				streamline: { api: { system: { selectFolder: () => Promise<string | null> } } };
			}
		).streamline.api.system.selectFolder = vi.fn().mockResolvedValue(null);
		const { getByText } = render((await import('./FolderField.svelte')).default, {
			label: 'L',
			value: '/existing'
		});
		await fireEvent.click(getByText('/existing'));
		await vi.waitFor(() => expect(getByText('/existing')).toBeTruthy());
	});

	it('renders label', async () => {
		const { getByText } = render((await import('./FolderField.svelte')).default, {
			label: 'Output folder',
			value: ''
		});
		expect(getByText('Output folder')).toBeTruthy();
	});

	it('shows placeholder when no value', async () => {
		const { getByText } = render((await import('./FolderField.svelte')).default, {
			label: 'L',
			value: '',
			placeholder: 'Pick a folder'
		});
		expect(getByText('Pick a folder')).toBeTruthy();
	});

	it('shows current value when set', async () => {
		const { getByText } = render((await import('./FolderField.svelte')).default, {
			label: 'L',
			value: '/my/folder'
		});
		expect(getByText('/my/folder')).toBeTruthy();
	});

	it('calls selectFolder on button click', async () => {
		const { getByRole } = render((await import('./FolderField.svelte')).default, {
			label: 'L',
			value: ''
		});
		await fireEvent.click(getByRole('button'));
		expect(window.streamline.api.system.selectFolder).toHaveBeenCalledOnce();
	});
});
