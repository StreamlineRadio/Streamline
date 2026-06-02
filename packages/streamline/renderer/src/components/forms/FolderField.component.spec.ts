import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

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
