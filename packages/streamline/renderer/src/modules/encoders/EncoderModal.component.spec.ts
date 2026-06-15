import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

import type { EncoderConfig } from '@streamline/shared';

const existingConfig: EncoderConfig = {
	id: 'enc-1',
	name: 'Live stream',
	type: 'icecast',
	format: 'mp3',
	bitrateKbps: 128,
	sampleRate: 44100,
	channels: 2,
	host: 'localhost',
	port: 8000,
	mount: '/stream',
	username: 'source'
};

function makeStreamline() {
	return {
		api: {
			system: {
				getDefaultRecordingsFolder: vi.fn().mockResolvedValue('/recordings'),
				selectFolder: vi.fn().mockResolvedValue(null)
			},
			secret: {
				set: vi.fn().mockResolvedValue(undefined),
				delete: vi.fn().mockResolvedValue(undefined)
			}
		}
	};
}

describe('EncoderModal', () => {
	beforeEach(() => {
		(window as unknown as Record<string, unknown>).streamline = makeStreamline();
	});

	afterEach(() => {
		delete (window as unknown as Record<string, unknown>).streamline;
	});

	it('shows "New Output" eyebrow when no config', async () => {
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			onSave: vi.fn(),
			onCancel: vi.fn()
		});
		await tick();
		expect(getByText('New Output')).toBeTruthy();
	});

	it('shows "Edit Output" eyebrow when editing existing config', async () => {
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			config: existingConfig,
			onSave: vi.fn(),
			onCancel: vi.fn()
		});
		await tick();
		expect(getByText('Edit Output')).toBeTruthy();
	});

	it('shows existing name in title', async () => {
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			config: existingConfig,
			onSave: vi.fn(),
			onCancel: vi.fn()
		});
		await tick();
		expect(getByText('Live stream')).toBeTruthy();
	});

	it('calls onCancel when Cancel clicked', async () => {
		const onCancel = vi.fn();
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			onSave: vi.fn(),
			onCancel
		});
		await tick();
		await fireEvent.click(getByText('Cancel'));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('updates icecast fields through their inputs before saving', async () => {
		const onSave = vi.fn();
		const { container, getByText } = render((await import('./EncoderModal.svelte')).default, {
			onSave,
			onCancel: vi.fn()
		});
		const textInputs = [...container.querySelectorAll('input[type="text"]')] as HTMLInputElement[];
		for (const input of textInputs) {
			await fireEvent.input(input, { target: { value: input.value || 'x' } });
		}
		const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
		expect(passwordInput).toBeTruthy();
		await fireEvent.input(passwordInput, { target: { value: 'hunter2' } });
		const selects = [...container.querySelectorAll('select')] as HTMLSelectElement[];
		expect(selects.length).toBeGreaterThanOrEqual(3);
		await fireEvent.change(selects[0], { target: { value: 'shoutcast' } });
		await fireEvent.change(selects[1], { target: { value: 'aac' } });
		await fireEvent.change(selects[2], { target: { value: '1' } });
		await fireEvent.click(getByText('Save'));
		expect(onSave).toHaveBeenCalled();
	});

	it('updates file fields through their inputs before saving', async () => {
		(window as unknown as Record<string, unknown>).streamline = {
			api: { system: { selectFolder: vi.fn().mockResolvedValue('/music/out') } }
		};
		try {
			const onSave = vi.fn();
			const { container, getByText } = render((await import('./EncoderModal.svelte')).default, {
				config: {
					id: 'enc-f',
					name: 'File Out',
					type: 'file',
					format: 'flac',
					bitrateKbps: 320,
					sampleRate: 48000,
					channels: 2,
					pathTemplate: '/music/{date}.flac'
				},
				onSave,
				onCancel: vi.fn()
			});
			const folderButton = [...container.querySelectorAll('button')].find((b) =>
				b.textContent?.includes('/music')
			) as HTMLButtonElement;
			expect(folderButton).toBeTruthy();
			await fireEvent.click(folderButton);
			const filenameInput = [
				...container.querySelectorAll('input[type="text"]')
			].pop() as HTMLInputElement;
			await fireEvent.input(filenameInput, { target: { value: 'show-{date}' } });
			await fireEvent.click(getByText('Save'));
			expect(onSave).toHaveBeenCalled();
		} finally {
			delete (window as unknown as Record<string, unknown>).streamline;
		}
	});

	it('calls onSave when Save clicked', async () => {
		const onSave = vi.fn();
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			config: existingConfig,
			onSave,
			onCancel: vi.fn()
		});
		await tick();
		await Promise.resolve();
		await fireEvent.click(getByText('Save'));
		await tick();
		expect(onSave).toHaveBeenCalledOnce();
	});

	it('shows file-specific fields when type is file', async () => {
		const fileConfig: EncoderConfig = {
			id: 'enc-2',
			name: 'Recording',
			type: 'file',
			format: 'mp3',
			bitrateKbps: 128,
			sampleRate: 44100,
			channels: 2,
			pathTemplate: '/recordings/recording-{date}-{time}.mp3'
		};
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			config: fileConfig,
			onSave: vi.fn(),
			onCancel: vi.fn()
		});
		await tick();
		await Promise.resolve();
		expect(getByText('Folder')).toBeTruthy();
		expect(getByText('Filename')).toBeTruthy();
	});

	it('calls onSave for file config with undefined passwordRef', async () => {
		const fileConfig: EncoderConfig = {
			id: 'enc-2',
			name: 'Recording',
			type: 'file',
			format: 'mp3',
			bitrateKbps: 128,
			sampleRate: 44100,
			channels: 2,
			pathTemplate: '/recordings/recording-{date}-{time}.mp3'
		};
		const onSave = vi.fn();
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			config: fileConfig,
			onSave,
			onCancel: vi.fn()
		});
		await tick();
		await Promise.resolve();
		await fireEvent.click(getByText('Save'));
		await tick();
		expect(onSave).toHaveBeenCalledOnce();
		const savedConfig = onSave.mock.calls[0][0] as EncoderConfig;
		expect(savedConfig.type).toBe('file');
	});

	it('calls onSave with generated id when no config provided', async () => {
		const onSave = vi.fn();
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			onSave,
			onCancel: vi.fn()
		});
		await tick();
		await Promise.resolve();
		await fireEvent.click(getByText('Save'));
		await tick();
		expect(onSave).toHaveBeenCalledOnce();
		const savedConfig = onSave.mock.calls[0][0] as EncoderConfig;
		expect(savedConfig.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		);
	});

	it('shows (unchanged) password placeholder when config has passwordRef', async () => {
		const configWithPassword: EncoderConfig = {
			...existingConfig,
			passwordRef: 'encoder-pw-enc-1'
		};
		const { container } = render((await import('./EncoderModal.svelte')).default, {
			config: configWithPassword,
			onSave: vi.fn(),
			onCancel: vi.fn()
		});
		await tick();
		const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
		expect(passwordInput?.placeholder).toBe('(unchanged)');
	});

	it('uses existing passwordRef when saving without changing password', async () => {
		const configWithPassword: EncoderConfig = {
			...existingConfig,
			passwordRef: 'encoder-pw-enc-1'
		};
		const onSave = vi.fn();
		const { getByText } = render((await import('./EncoderModal.svelte')).default, {
			config: configWithPassword,
			onSave,
			onCancel: vi.fn()
		});
		await tick();
		await Promise.resolve();
		await fireEvent.click(getByText('Save'));
		await tick();
		expect(onSave).toHaveBeenCalledOnce();
		const savedConfig = onSave.mock.calls[0][0] as EncoderConfig;
		expect(savedConfig.type !== 'file' && savedConfig.passwordRef).toBe('encoder-pw-enc-1');
	});
});
