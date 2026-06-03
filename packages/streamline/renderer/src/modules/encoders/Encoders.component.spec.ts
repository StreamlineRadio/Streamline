import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({ FontAwesomeIcon: vi.fn() }));

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
