import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

vi.mock('@fortawesome/svelte-fontawesome', () => ({
	FontAwesomeIcon: vi.fn()
}));

import IconButton from './IconButton.svelte';

const fakeIcon = {} as import('@fortawesome/fontawesome-svg-core').IconDefinition;

describe('IconButton', () => {
	it('renders with aria-label from title', () => {
		const { getByRole } = render(IconButton, { icon: fakeIcon, title: 'Play' });
		expect(getByRole('button', { name: 'Play' })).toBeTruthy();
	});

	it('calls onclick when clicked', async () => {
		const onclick = vi.fn();
		const { getByRole } = render(IconButton, { icon: fakeIcon, title: 'Play', onclick });
		await fireEvent.click(getByRole('button'));
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('is disabled when disabled prop set', () => {
		const { getByRole } = render(IconButton, { icon: fakeIcon, title: 'Play', disabled: true });
		expect((getByRole('button') as HTMLButtonElement).disabled).toBe(true);
	});

	it('applies active class when active', () => {
		const { getByRole } = render(IconButton, { icon: fakeIcon, title: 'Play', active: true });
		expect(getByRole('button').className).toContain('bg-primary-800');
	});

	it('applies destructive hover classes when destructive', () => {
		const { getByRole } = render(IconButton, {
			icon: fakeIcon,
			title: 'Delete',
			destructive: true
		});
		expect(getByRole('button').className).toContain('hover:bg-danger-950');
	});
});
