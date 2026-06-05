import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createTripleTapHandler,
	initResetToDefaultHotkey,
	TAP_WINDOW_MS
} from './reset-to-default';

interface FakeKeyEvent {
	code: string;
	key?: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	repeat?: boolean;
	target?: { tagName?: string; isContentEditable?: boolean } | null;
	preventDefault: () => void;
}

function makeEvent(overrides: Partial<FakeKeyEvent> = {}): KeyboardEvent {
	const preventDefault = vi.fn();
	return {
		code: 'KeyR',
		key: 'R',
		ctrlKey: true,
		metaKey: false,
		shiftKey: true,
		altKey: false,
		repeat: false,
		target: null,
		preventDefault,
		...overrides
	} as unknown as KeyboardEvent;
}

describe('createTripleTapHandler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-05-28T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('fires onFire after three valid Ctrl+Shift+R taps within the window', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		handler(makeEvent());
		handler(makeEvent());
		expect(onFire).not.toHaveBeenCalled();
		handler(makeEvent());
		expect(onFire).toHaveBeenCalledTimes(1);
	});

	it('fires after three valid Meta+Shift+R taps (mac modifier)', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		const macEvent = () => makeEvent({ ctrlKey: false, metaKey: true });
		handler(macEvent());
		handler(macEvent());
		handler(macEvent());
		expect(onFire).toHaveBeenCalledTimes(1);
	});

	it('does not fire when the gap between taps exceeds TAP_WINDOW_MS', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		handler(makeEvent());
		handler(makeEvent());
		vi.advanceTimersByTime(TAP_WINDOW_MS + 50);
		handler(makeEvent());
		expect(onFire).not.toHaveBeenCalled();
	});

	it('ignores event.repeat (holding the key does not multi-fire)', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		handler(makeEvent());
		handler(makeEvent({ repeat: true }));
		handler(makeEvent({ repeat: true }));
		expect(onFire).not.toHaveBeenCalled();
	});

	it('ignores presses without both Ctrl/Meta AND Shift held', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		handler(makeEvent({ shiftKey: false }));
		handler(makeEvent({ ctrlKey: false, metaKey: false }));
		handler(makeEvent());
		expect(onFire).not.toHaveBeenCalled();
	});

	it('ignores presses on keys other than KeyR', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		handler(makeEvent({ code: 'KeyT' }));
		handler(makeEvent({ code: 'KeyT' }));
		handler(makeEvent({ code: 'KeyT' }));
		expect(onFire).not.toHaveBeenCalled();
	});

	it('ignores keydowns whose target is an INPUT, TEXTAREA, SELECT, or contentEditable', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
			handler(makeEvent({ target: { tagName } }));
			handler(makeEvent({ target: { tagName } }));
			handler(makeEvent({ target: { tagName } }));
		}
		handler(makeEvent({ target: { isContentEditable: true } }));
		handler(makeEvent({ target: { isContentEditable: true } }));
		handler(makeEvent({ target: { isContentEditable: true } }));
		expect(onFire).not.toHaveBeenCalled();
	});

	it('calls preventDefault on each valid tap so the browser does not reload', () => {
		const handler = createTripleTapHandler(() => {});
		const event = makeEvent();
		handler(event);
		expect(event.preventDefault).toHaveBeenCalledTimes(1);
	});

	it('resets the counter after firing so a subsequent burst requires three more taps', () => {
		const onFire = vi.fn();
		const handler = createTripleTapHandler(onFire);

		handler(makeEvent());
		handler(makeEvent());
		handler(makeEvent());
		expect(onFire).toHaveBeenCalledTimes(1);

		handler(makeEvent());
		handler(makeEvent());
		expect(onFire).toHaveBeenCalledTimes(1);
		handler(makeEvent());
		expect(onFire).toHaveBeenCalledTimes(2);
	});
});

describe('initResetToDefaultHotkey', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('registers keydown listener and teardown removes it', () => {
		vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
		const teardown = initResetToDefaultHotkey();
		const capturedCallback = vi.mocked(window.addEventListener).mock.calls[0][1];
		expect(capturedCallback).toBeTypeOf('function');
		teardown();
		expect(window.removeEventListener).toHaveBeenCalledWith('keydown', capturedCallback);
	});
});
