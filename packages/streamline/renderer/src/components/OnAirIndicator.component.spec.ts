import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import OnAirIndicator from './OnAirIndicator.svelte';

describe('OnAirIndicator', () => {
	it('shows OFF AIR when inactive', () => {
		const { getByText } = render(OnAirIndicator, { active: false });
		expect(getByText('OFF AIR')).toBeTruthy();
	});

	it('shows ON AIR when active', () => {
		const { getByText } = render(OnAirIndicator, { active: true });
		expect(getByText('ON AIR')).toBeTruthy();
	});

	it('applies pulse animation class when active', () => {
		const { container } = render(OnAirIndicator, { active: true });
		expect(container.querySelector('.animate-pulse')).toBeTruthy();
	});

	it('does not apply pulse animation class when inactive', () => {
		const { container } = render(OnAirIndicator, { active: false });
		expect(container.querySelector('.animate-pulse')).toBeNull();
	});
});
