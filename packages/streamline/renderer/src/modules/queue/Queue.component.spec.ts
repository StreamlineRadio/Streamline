import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Queue from './Queue.svelte';

const { layoutUpdateInstance, instanceUpdate } = vi.hoisted(() => ({
	layoutUpdateInstance: vi.fn(),
	instanceUpdate: vi.fn()
}));

vi.mock('../instance-store.svelte', () => ({
	instanceStore: {
		get: () => ({
			record: { settingsJson: JSON.stringify({ autoplay: false, linkedDeckIds: [] }) }
		}),
		update: instanceUpdate,
		add: vi.fn(),
		remove: vi.fn(),
		all: new Map()
	}
}));

vi.mock('../../layout/store.svelte', () => ({
	layoutStore: {
		active: { id: 'L', instances: [] },
		set: vi.fn(),
		updateInstance: layoutUpdateInstance
	}
}));

vi.mock('../../assets/favicon.svg?url', () => ({ default: 'favicon.svg' }));

describe('Queue (component) — settings persistence', () => {
	beforeEach(() => {
		layoutUpdateInstance.mockReset();
		instanceUpdate.mockReset();
	});

	it('toggling the autoplay toolbar button persists autoplay in settingsJson', async () => {
		const { container } = render(Queue, { instanceId: 'q1' });
		const autoplayButton = container.querySelector('[title="Autoplay off"]') as HTMLButtonElement;
		await fireEvent.click(autoplayButton);
		expect(layoutUpdateInstance).toHaveBeenCalledWith(
			'q1',
			expect.objectContaining({
				settingsJson: expect.stringContaining('"autoplay":true')
			})
		);
	});
});
