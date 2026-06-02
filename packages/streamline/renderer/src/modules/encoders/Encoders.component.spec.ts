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
});
