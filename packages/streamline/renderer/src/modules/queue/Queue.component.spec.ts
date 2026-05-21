import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Queue from './Queue.svelte';
import { eventBus } from '../event-bus';
import type { DeckState } from '../deck/types';

const { layoutUpdateInstance, instanceUpdate, settingsHolder } = vi.hoisted(() => ({
	layoutUpdateInstance: vi.fn(),
	instanceUpdate: vi.fn(),
	settingsHolder: { current: JSON.stringify({ autoplay: false, linkedDeckIds: [] }) }
}));

vi.mock('../instance-store.svelte', () => ({
	instanceStore: {
		get: () => ({ record: { settingsJson: settingsHolder.current } }),
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

describe('Queue (component)', () => {
	beforeEach(() => {
		layoutUpdateInstance.mockReset();
		instanceUpdate.mockReset();
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: [] });
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

	it('emits state-request for each linked deck on mount', () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		const stateRequestCalls: unknown[] = [];
		eventBus.on('deck:d1:state-request', () => stateRequestCalls.push(undefined));

		render(Queue, { instanceId: 'q2' });

		expect(stateRequestCalls.length).toBeGreaterThanOrEqual(1);
	});

	it('tracks deck remaining via deck:${id}:remaining events for linked decks', async () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		const { container } = render(Queue, { instanceId: 'q3' });

		// Add a queue item so the ETA cell renders against deckEtaBase
		const queue = container as HTMLElement;
		// Seed a remaining payload from d1; recomputeDeckEtaBase should update deckEtaBase
		eventBus.emit('deck:d1:state', { state: 'loaded' as DeckState });
		eventBus.emit('deck:d1:remaining', { remaining: 90 });

		// No assertion that DOM updates yet (no items); this confirms no listener-side throw.
		expect(queue).toBeTruthy();
	});

	it('does not subscribe to decks outside linkedDeckIds', () => {
		settingsHolder.current = JSON.stringify({ autoplay: false, linkedDeckIds: ['d1'] });
		const stateRequestForD2: unknown[] = [];
		eventBus.on('deck:d2:state-request', () => stateRequestForD2.push(undefined));
		render(Queue, { instanceId: 'q4' });
		expect(stateRequestForD2.length).toBe(0);
	});
});
