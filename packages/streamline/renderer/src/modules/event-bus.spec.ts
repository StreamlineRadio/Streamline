import { describe, it, expect, vi } from 'vitest';
import { eventBus } from './event-bus';

describe('eventBus', () => {
	it('delivers payload to subscriber', () => {
		const handler = vi.fn();
		const unsub = eventBus.on('test:event', handler);
		eventBus.emit('test:event', { data: 42 });
		expect(handler).toHaveBeenCalledWith({ data: 42 });
		unsub();
	});

	it('does not deliver after unsubscribe', () => {
		const handler = vi.fn();
		const unsub = eventBus.on('test:gone', handler);
		unsub();
		eventBus.emit('test:gone', 'payload');
		expect(handler).not.toHaveBeenCalled();
	});

	it('delivers to multiple subscribers', () => {
		const a = vi.fn();
		const b = vi.fn();
		const u1 = eventBus.on('multi', a);
		const u2 = eventBus.on('multi', b);
		eventBus.emit('multi', 1);
		expect(a).toHaveBeenCalledWith(1);
		expect(b).toHaveBeenCalledWith(1);
		u1();
		u2();
	});
});
