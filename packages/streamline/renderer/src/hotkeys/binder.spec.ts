import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _clearEventBusForTesting, eventBus } from '../modules/event-bus';

vi.mock('./store.svelte', () => ({
	hotkeyStore: {
		all: [{ id: 'h1', instanceId: 'deck-1', action: 'play', accelerator: 'Space' }]
	}
}));

import { initHotkeyBinder } from './binder';

describe('initHotkeyBinder', () => {
	let capturedListeners: Map<string, EventListener>;

	beforeEach(() => {
		capturedListeners = new Map();
		vi.stubGlobal('window', {
			addEventListener: vi.fn((event: string, cb: EventListener) =>
				capturedListeners.set(event, cb)
			),
			removeEventListener: vi.fn()
		});
		_clearEventBusForTesting();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		_clearEventBusForTesting();
	});

	it('registers keydown listener on window', () => {
		initHotkeyBinder();
		expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
	});

	it('returned teardown removes keydown listener', () => {
		const teardown = initHotkeyBinder();
		const registeredHandler = capturedListeners.get('keydown');
		teardown();
		expect(window.removeEventListener).toHaveBeenCalledWith('keydown', registeredHandler);
	});

	it('emits hotkey event when matching accelerator key pressed', () => {
		initHotkeyBinder();
		const emitted: unknown[] = [];
		eventBus.on('deck-1:play', (payload) => emitted.push(payload));
		const handler = capturedListeners.get('keydown')!;
		handler({
			code: 'Space',
			key: ' ',
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			target: { tagName: 'DIV', isContentEditable: false },
			preventDefault: vi.fn()
		} as unknown as Event);
		expect(emitted).toHaveLength(1);
	});

	it('ignores key press when target is an INPUT', () => {
		initHotkeyBinder();
		const emitted: unknown[] = [];
		eventBus.on('deck-1:play', (payload) => emitted.push(payload));
		const handler = capturedListeners.get('keydown')!;
		handler({
			code: 'Space',
			key: ' ',
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			target: { tagName: 'INPUT', isContentEditable: false },
			preventDefault: vi.fn()
		} as unknown as Event);
		expect(emitted).toHaveLength(0);
	});

	it('ignores key press for unregistered accelerator', () => {
		initHotkeyBinder();
		const emitted: unknown[] = [];
		eventBus.on('deck-1:play', (payload) => emitted.push(payload));
		const handler = capturedListeners.get('keydown')!;
		handler({
			code: 'KeyZ',
			key: 'z',
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			target: { tagName: 'DIV', isContentEditable: false },
			preventDefault: vi.fn()
		} as unknown as Event);
		expect(emitted).toHaveLength(0);
	});

	it('does not append a key part for a modifier-only key press', () => {
		initHotkeyBinder();
		const emitted: unknown[] = [];
		eventBus.on('deck-1:play', (payload) => emitted.push(payload));
		const handler = capturedListeners.get('keydown')!;
		handler({
			code: 'ControlLeft',
			key: 'Control',
			ctrlKey: true,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			target: { tagName: 'DIV', isContentEditable: false },
			preventDefault: vi.fn()
		} as unknown as Event);
		expect(emitted).toHaveLength(0);
	});

	it('normalizes modifier keys (Ctrl+Alt+Shift+Meta) without matching', () => {
		initHotkeyBinder();
		const emitted: unknown[] = [];
		eventBus.on('deck-1:play', (payload) => emitted.push(payload));
		const handler = capturedListeners.get('keydown')!;
		handler({
			code: 'KeyZ',
			key: 'z',
			ctrlKey: true,
			altKey: true,
			shiftKey: true,
			metaKey: true,
			target: { tagName: 'DIV', isContentEditable: false },
			preventDefault: vi.fn()
		} as unknown as Event);
		expect(emitted).toHaveLength(0);
	});
});
