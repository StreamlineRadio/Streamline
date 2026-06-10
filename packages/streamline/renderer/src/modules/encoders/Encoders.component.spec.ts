import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

import type { EncoderConfig } from '@streamline/shared';

const fakeConfig: EncoderConfig = {
	id: 'enc-1',
	name: 'My Icecast',
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

function makeStreamline(configs: EncoderConfig[] = []) {
	return {
		onEncoderStatus: vi.fn(),
		api: {
			encoder: {
				listConfigs: vi.fn().mockResolvedValue(configs),
				saveConfig: vi.fn().mockResolvedValue(undefined),
				deleteConfig: vi.fn().mockResolvedValue(undefined),
				start: vi.fn().mockResolvedValue(undefined),
				stop: vi.fn().mockResolvedValue(undefined)
			},
			settings: {
				get: vi.fn().mockResolvedValue(null),
				set: vi.fn().mockResolvedValue(undefined)
			},
			secret: {
				delete: vi.fn().mockResolvedValue(undefined)
			},
			system: {
				getDefaultRecordingsFolder: vi.fn().mockResolvedValue('/recordings'),
				selectFolder: vi.fn().mockResolvedValue(null)
			}
		}
	};
}

describe('Encoders', () => {
	beforeEach(() => {
		(window as unknown as Record<string, unknown>).streamline = makeStreamline();
	});

	afterEach(() => {
		delete (window as unknown as Record<string, unknown>).streamline;
	});

	it('shows empty state when no configs', async () => {
		const { getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('No outputs yet')).toBeTruthy();
	});

	it('renders encoder card when configs loaded', async () => {
		(window as unknown as Record<string, unknown>).streamline = makeStreamline([fakeConfig]);
		const { getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByText('My Icecast')).toBeTruthy();
	});

	it('opens modal when Add encoder button clicked', async () => {
		const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		await fireEvent.click(getByTitle('Add encoder'));
		await tick();
		expect(getByText('New Output')).toBeTruthy();
	});

	it('calls deleteConfig when delete button clicked', async () => {
		const streamlineMock = makeStreamline([fakeConfig]);
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { getByTitle } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		await fireEvent.click(getByTitle('Delete encoder'));
		await tick();
		await Promise.resolve();
		expect(streamlineMock.api.encoder.deleteConfig).toHaveBeenCalledWith('enc-1');
	});

	it('calls encoder.start when start streaming clicked', async () => {
		const streamlineMock = makeStreamline([fakeConfig]);
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { getByTitle } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		await fireEvent.click(getByTitle('Start streaming'));
		await tick();
		await Promise.resolve();
		expect(streamlineMock.api.encoder.start).toHaveBeenCalled();
	});

	it('falls back to load order when stored order JSON is malformed', async () => {
		const streamline = makeStreamline([fakeConfig]);
		streamline.api.settings.get = vi.fn().mockResolvedValue('{not-json');
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const { getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-order-bad'
		});
		await vi.waitFor(() => expect(getByText('My Icecast')).toBeTruthy());
	});

	it('reorders encoders via drag and drop and persists the order', async () => {
		const second = { ...fakeConfig, id: 'enc-2', name: 'Second Out' };
		const streamline = makeStreamline([fakeConfig, second]);
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const { container, getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-dnd'
		});
		await vi.waitFor(() => expect(getByText('Second Out')).toBeTruthy());
		const rows = [...container.querySelectorAll('[draggable="true"]')] as HTMLElement[];
		expect(rows.length).toBe(2);
		const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() };
		await fireEvent.dragStart(rows[0], { dataTransfer });
		await fireEvent.dragOver(rows[1], { dataTransfer });
		await fireEvent.drop(rows[1], { dataTransfer });
		await fireEvent.dragEnd(rows[0], { dataTransfer });
		await vi.waitFor(() =>
			expect(streamline.api.settings.set).toHaveBeenCalledWith(
				'encoders.order.enc-dnd',
				JSON.stringify(['enc-2', 'enc-1'])
			)
		);
	});

	it('logs an error when persisting the order fails', async () => {
		const second = { ...fakeConfig, id: 'enc-2', name: 'Second Out' };
		const streamline = makeStreamline([fakeConfig, second]);
		streamline.api.settings.set = vi.fn().mockRejectedValue(new Error('disk full'));
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const { container, getByText } = render((await import('./Encoders.svelte')).default, {
				instanceId: 'enc-dnd-err'
			});
			await vi.waitFor(() => expect(getByText('Second Out')).toBeTruthy());
			const rows = [...container.querySelectorAll('[draggable="true"]')] as HTMLElement[];
			const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() };
			await fireEvent.dragStart(rows[0], { dataTransfer });
			await fireEvent.drop(rows[1], { dataTransfer });
			await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
		} finally {
			errorSpy.mockRestore();
		}
	});

	it('closes the add-encoder modal via Cancel', async () => {
		const { getByTitle, getByText, queryByText } = render(
			(await import('./Encoders.svelte')).default,
			{ instanceId: 'enc-cancel' }
		);
		await fireEvent.click(getByTitle('Add encoder'));
		await vi.waitFor(() => expect(getByText('Cancel')).toBeTruthy());
		await fireEvent.click(getByText('Cancel'));
		await vi.waitFor(() => expect(queryByText('Cancel')).toBeNull());
	});

	it('saves a new encoder config from the modal', async () => {
		const streamline = makeStreamline([]);
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-save'
		});
		await fireEvent.click(getByTitle('Add encoder'));
		await vi.waitFor(() => expect(getByText('Save')).toBeTruthy());
		await fireEvent.click(getByText('Save'));
		await vi.waitFor(() => expect(streamline.api.encoder.saveConfig).toHaveBeenCalled());
	});

	it('calls encoder.stop when stopping an active encoder', async () => {
		const streamline = makeStreamline([fakeConfig]);
		(window as unknown as Record<string, unknown>).streamline = streamline;
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		streamline.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-stop'
		});
		await vi.waitFor(() => expect(getByText('My Icecast')).toBeTruthy());
		statusCallback?.('enc-1', { status: 'streaming', bytesEncoded: 0, secondsEncoded: 0 });
		await tick();
		await fireEvent.click(getByTitle('Stop streaming'));
		await vi.waitFor(() => expect(streamline.api.encoder.stop).toHaveBeenCalledWith('enc-1'));
	});

	it('logs an error when saving a config fails', async () => {
		const streamline = makeStreamline([]);
		streamline.api.encoder.saveConfig = vi.fn().mockRejectedValue(new Error('nope'));
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
				instanceId: 'enc-save-err'
			});
			await fireEvent.click(getByTitle('Add encoder'));
			await vi.waitFor(() => expect(getByText('Save')).toBeTruthy());
			await fireEvent.click(getByText('Save'));
			await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
		} finally {
			errorSpy.mockRestore();
		}
	});

	it('deletes the stored secret when removing an encoder with a passwordRef', async () => {
		const withSecret = { ...fakeConfig, passwordRef: 'secret-1' };
		const streamline = makeStreamline([withSecret]);
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-del-secret'
		});
		await vi.waitFor(() => expect(getByText('My Icecast')).toBeTruthy());
		await fireEvent.click(getByTitle('Delete encoder'));
		await vi.waitFor(() => expect(streamline.api.secret.delete).toHaveBeenCalledWith('secret-1'));
	});

	it('logs an error when deleting an encoder fails', async () => {
		const streamline = makeStreamline([fakeConfig]);
		streamline.api.encoder.deleteConfig = vi.fn().mockRejectedValue(new Error('nope'));
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
				instanceId: 'enc-del-err'
			});
			await vi.waitFor(() => expect(getByText('My Icecast')).toBeTruthy());
			await fireEvent.click(getByTitle('Delete encoder'));
			await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
		} finally {
			errorSpy.mockRestore();
		}
	});

	it('logs an error when toggling streaming fails', async () => {
		const streamline = makeStreamline([fakeConfig]);
		streamline.api.encoder.start = vi.fn().mockRejectedValue(new Error('nope'));
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
				instanceId: 'enc-start-err'
			});
			await vi.waitFor(() => expect(getByText('My Icecast')).toBeTruthy());
			await fireEvent.click(getByTitle('Start streaming'));
			await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());
		} finally {
			errorSpy.mockRestore();
		}
	});

	it('ignores drag events without prior dragstart or dataTransfer', async () => {
		const second = { ...fakeConfig, id: 'enc-2', name: 'Second Out' };
		const streamline = makeStreamline([fakeConfig, second]);
		(window as unknown as Record<string, unknown>).streamline = streamline;
		const { container, getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-dnd-edge'
		});
		await vi.waitFor(() => expect(getByText('Second Out')).toBeTruthy());
		const rows = [...container.querySelectorAll('[draggable="true"]')] as HTMLElement[];
		await fireEvent.dragOver(rows[1]);
		await fireEvent.drop(rows[1]);
		await fireEvent.dragStart(rows[0]);
		await fireEvent.dragOver(rows[1]);
		await fireEvent.dragOver(rows[1]);
		await fireEvent.drop(rows[0]);
		expect(streamline.api.settings.set).not.toHaveBeenCalled();
	});

	it('applies stored order from valid JSON when configs loaded', async () => {
		const configA: EncoderConfig = { ...fakeConfig, id: 'enc-a', name: 'Encoder A' };
		const configB: EncoderConfig = { ...fakeConfig, id: 'enc-b', name: 'Encoder B' };
		const configC: EncoderConfig = { ...fakeConfig, id: 'enc-c', name: 'Encoder C' };
		const streamlineMock = makeStreamline([configA, configB, configC]);
		streamlineMock.api.settings.get = vi.fn().mockResolvedValue(JSON.stringify(['enc-b', 'enc-a']));
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { getAllByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		const names = getAllByText(/Encoder [ABC]/);
		expect(names[0].textContent).toBe('Encoder B');
		expect(names[1].textContent).toBe('Encoder A');
		expect(names[2].textContent).toBe('Encoder C');
	});

	it('ignores stored order when orderJson is not an array', async () => {
		const configA: EncoderConfig = { ...fakeConfig, id: 'enc-a', name: 'Encoder A' };
		const configB: EncoderConfig = { ...fakeConfig, id: 'enc-b', name: 'Encoder B' };
		const streamlineMock = makeStreamline([configA, configB]);
		streamlineMock.api.settings.get = vi.fn().mockResolvedValue('"not-an-array"');
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { getAllByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		const names = getAllByText(/Encoder [AB]/);
		expect(names[0].textContent).toBe('Encoder A');
		expect(names[1].textContent).toBe('Encoder B');
	});

	it('places configs missing from order JSON at the end', async () => {
		const configA: EncoderConfig = { ...fakeConfig, id: 'enc-a', name: 'Encoder A' };
		const configB: EncoderConfig = { ...fakeConfig, id: 'enc-b', name: 'Encoder B' };
		const configC: EncoderConfig = { ...fakeConfig, id: 'enc-c', name: 'Encoder C' };
		const streamlineMock = makeStreamline([configC, configA, configB]);
		streamlineMock.api.settings.get = vi.fn().mockResolvedValue(JSON.stringify(['enc-b']));
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { getAllByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		const names = getAllByText(/Encoder [ABC]/);
		expect(names[0].textContent).toBe('Encoder B');
	});

	it('activeCount includes connecting-status encoders', async () => {
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		const streamlineMock = makeStreamline([fakeConfig]);
		streamlineMock.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		statusCallback!('enc-1', { status: 'connecting' });
		await tick();
		expect(container.textContent).toContain('1 live');
		statusCallback!('enc-1', { status: 'idle' });
		await tick();
		expect(container.textContent).not.toContain('live');
	});

	it('opens edit modal when Edit encoder button clicked', async () => {
		const streamlineMock = makeStreamline([fakeConfig]);
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { getByTitle, getByText } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		await fireEvent.click(getByTitle('Edit encoder'));
		await tick();
		expect(getByText('Edit Output')).toBeTruthy();
	});

	it('shows streaming stats when encoder status is streaming', async () => {
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		const streamlineMock = makeStreamline([fakeConfig]);
		streamlineMock.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		statusCallback!('enc-1', {
			status: 'streaming',
			secondsEncoded: 90,
			bytesEncoded: 2048,
			currentBitrate: 128
		});
		await tick();
		expect(container.textContent).toContain('00:01:30');
		expect(container.textContent).toContain('2.0 KB');
		expect(container.textContent).toContain('128k');
	});

	it('shows streaming stats in MB when bytesEncoded is large', async () => {
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		const streamlineMock = makeStreamline([fakeConfig]);
		streamlineMock.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		statusCallback!('enc-1', {
			status: 'streaming',
			secondsEncoded: 3600,
			bytesEncoded: 5 * 1024 * 1024,
			currentBitrate: 128
		});
		await tick();
		expect(container.textContent).toContain('5.0 MB');
		expect(container.textContent).toContain('01:00:00');
	});

	it('renders file-type encoder card correctly', async () => {
		const fileConfig: EncoderConfig = {
			id: 'enc-file',
			name: 'Local Recording',
			type: 'file',
			format: 'mp3',
			bitrateKbps: 192,
			sampleRate: 44100,
			channels: 2,
			pathTemplate: '/recordings/{date}.mp3'
		};
		const streamlineMock = makeStreamline([fileConfig]);
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { getByTitle } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		expect(getByTitle('/recordings/{date}.mp3')).toBeTruthy();
	});

	it('shows Mono label when encoder config has 1 channel', async () => {
		const monoConfig: EncoderConfig = { ...fakeConfig, id: 'enc-mono', channels: 1 };
		const streamlineMock = makeStreamline([monoConfig]);
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		expect(container.textContent).toContain('Mono');
	});

	it('shows streaming stats in GB when bytesEncoded exceeds 1 GB', async () => {
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		const streamlineMock = makeStreamline([fakeConfig]);
		streamlineMock.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		statusCallback!('enc-1', {
			status: 'streaming',
			secondsEncoded: 0,
			bytesEncoded: 2 * 1024 * 1024 * 1024,
			currentBitrate: 0
		});
		await tick();
		expect(container.textContent).toContain('2.00 GB');
	});

	it('shows listener count when streaming status includes listeners', async () => {
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		const streamlineMock = makeStreamline([fakeConfig]);
		streamlineMock.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		statusCallback!('enc-1', {
			status: 'streaming',
			secondsEncoded: 0,
			bytesEncoded: 0,
			currentBitrate: 0,
			listeners: 5
		});
		await tick();
		expect(container.textContent).toContain('Listeners');
		expect(container.textContent).toContain('5');
	});

	it('shows Connecting label when encoder status is connecting', async () => {
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		const streamlineMock = makeStreamline([fakeConfig]);
		streamlineMock.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		statusCallback!('enc-1', { status: 'connecting' });
		await tick();
		expect(container.textContent).toContain('Connecting');
	});

	it('shows error message when encoder status is error', async () => {
		let statusCallback: ((id: string, status: unknown) => void) | undefined;
		const streamlineMock = makeStreamline([fakeConfig]);
		streamlineMock.onEncoderStatus = vi.fn().mockImplementation((cb) => {
			statusCallback = cb;
		});
		(window as unknown as Record<string, unknown>).streamline = streamlineMock;
		const { container } = render((await import('./Encoders.svelte')).default, {
			instanceId: 'enc-inst'
		});
		await tick();
		await Promise.resolve();
		await tick();
		statusCallback!('enc-1', { status: 'error', error: 'Connection refused' });
		await tick();
		expect(container.textContent).toContain('Connection refused');
	});
});
