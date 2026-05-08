import { describe, it, expect } from 'vitest';

function normalizeKey(event: Partial<KeyboardEvent>): string {
	const parts: string[] = [];
	if (event.ctrlKey) parts.push('Ctrl');
	if (event.altKey) parts.push('Alt');
	if (event.shiftKey) parts.push('Shift');
	if (event.metaKey) parts.push('Meta');
	const key = (event.code ?? '').replace(/^Key/, '').replace(/^Digit/, '');
	if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key ?? '')) parts.push(key);
	return parts.join('+');
}

describe('hotkey normalizer', () => {
	it('normalizes F1', () => expect(normalizeKey({ code: 'F1', key: 'F1' })).toBe('F1'));
	it('normalizes Space', () => expect(normalizeKey({ code: 'Space', key: ' ' })).toBe('Space'));
	it('normalizes Ctrl+S', () =>
		expect(normalizeKey({ ctrlKey: true, code: 'KeyS', key: 's' })).toBe('Ctrl+S'));
});
