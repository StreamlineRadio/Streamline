import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus, _clearEventBusForTesting } from './event-bus';

beforeEach(_clearEventBusForTesting);

describe('eventBus', () => {
	it('delivers payload to subscriber', () => {
		const handler = vi.fn();
		eventBus.on('test:event', handler);
		eventBus.emit('test:event', { data: 42 });
		expect(handler).toHaveBeenCalledWith({ data: 42 });
	});

	it('does not deliver after unsubscribe', () => {
		const handler = vi.fn();
		const unsub = eventBus.on('test:event', handler);
		unsub();
		eventBus.emit('test:event', 'payload');
		expect(handler).not.toHaveBeenCalled();
	});

	it('delivers to multiple subscribers', () => {
		const a = vi.fn();
		const b = vi.fn();
		eventBus.on('test:event', a);
		eventBus.on('test:event', b);
		eventBus.emit('test:event', 1);
		expect(a).toHaveBeenCalledWith(1);
		expect(b).toHaveBeenCalledWith(1);
	});
});
