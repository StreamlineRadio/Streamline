import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Crossfader from './Crossfader.svelte';
import { eventBus } from '../event-bus';
import { instanceStore } from '../instance-store.svelte';
import type { ModuleInstanceRecord } from '@streamline/shared';

function makeDeckRecord(id: string, title: string): ModuleInstanceRecord {
	return {
		id,
		layoutId: 'L',
		moduleId: 'deck',
		title,
		x: 0,
		y: 0,
		width: 200,
		height: 200,
		zIndex: 1,
		minimized: false,
		settingsJson: '{}'
	};
}

describe('Crossfader (component)', () => {
	beforeEach(() => {
		for (const id of [...instanceStore.all.keys()]) instanceStore.remove(id);
		instanceStore.add(makeDeckRecord('left-id', 'L'));
		instanceStore.add(makeDeckRecord('right-id', 'R'));
	});

	it('renders without deck options when no deck instances exist', () => {
		for (const id of [...instanceStore.all.keys()]) instanceStore.remove(id);
		const { container } = render(Crossfader, { instanceId: 'cf-empty' });
		const selects = container.querySelectorAll('select');
		expect(selects.length).toBe(2);
		const noneOptions = container.querySelectorAll('select option[value=""]');
		expect(noneOptions.length).toBe(2);
	});

	it('falls back to id-based label when deck title is empty', async () => {
		for (const id of [...instanceStore.all.keys()]) instanceStore.remove(id);
		instanceStore.add(makeDeckRecord('abcdef12', ''));
		const { container } = render(Crossfader, { instanceId: 'cf-fall' });
		await tick();
		const options = container.querySelectorAll('select option[value="abcdef12"]');
		expect(options.length).toBeGreaterThan(0);
		expect(options[0].getAttribute('label')).toBe('Deck abcd');
	});

	it('switches the curve via the curve buttons', async () => {
		const { container } = render(Crossfader, { instanceId: 'cf-curve' });
		const buttons = [...container.querySelectorAll('button')].filter((b) =>
			['linear', 'equal-power', 'cut'].includes(b.textContent?.trim() ?? '')
		);
		expect(buttons.length).toBe(3);
		await fireEvent.click(buttons[0]);
		expect(buttons[0].className).toContain('bg-secondary-700');
	});

	it('starts and cancels a crossfade via the main button', async () => {
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn().mockImplementation(() => 1)
		);
		vi.stubGlobal('cancelAnimationFrame', vi.fn());
		try {
			const { container, unmount } = render(Crossfader, { instanceId: 'cf-anim' });
			const mainButton = [...container.querySelectorAll('button')].find((b) =>
				b.textContent?.includes('Crossfade Now')
			) as HTMLButtonElement;
			expect(mainButton).toBeTruthy();
			await fireEvent.click(mainButton);
			expect(mainButton.textContent).toContain('Cancel');
			await fireEvent.click(mainButton);
			expect(mainButton.textContent).toContain('Crossfade Now');
			unmount();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('updates the fade duration via the number input', async () => {
		const { container } = render(Crossfader, { instanceId: 'cf-dur' });
		const durationInput = container.querySelector('#cf-dur-cf-dur') as HTMLInputElement;
		expect(durationInput).toBeTruthy();
		await fireEvent.input(durationInput, { target: { value: '8' } });
		expect(durationInput.value).toBe('8');
	});

	it('emits deck:${leftDeckId}:setVolume and deck:${rightDeckId}:setVolume when slider moves', async () => {
		const leftListener = vi.fn();
		const rightListener = vi.fn();
		eventBus.on('deck:left-id:setVolume', leftListener);
		eventBus.on('deck:right-id:setVolume', rightListener);

		const { container } = render(Crossfader, { instanceId: 'cf-1' });

		const leftSelect = container.querySelector('#cf-left-cf-1') as HTMLSelectElement;
		const rightSelect = container.querySelector('#cf-right-cf-1') as HTMLSelectElement;
		await fireEvent.change(leftSelect, { target: { value: 'left-id' } });
		await fireEvent.change(rightSelect, { target: { value: 'right-id' } });

		const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
		await fireEvent.input(slider, { target: { value: '0.25' } });

		expect(leftListener).toHaveBeenCalled();
		expect(rightListener).toHaveBeenCalled();
		expect(typeof leftListener.mock.calls[0][0]).toBe('number');
		expect(typeof rightListener.mock.calls[0][0]).toBe('number');
	});
});
