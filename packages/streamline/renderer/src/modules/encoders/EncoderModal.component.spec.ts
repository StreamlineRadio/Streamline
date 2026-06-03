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
