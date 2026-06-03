import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createModuleContext } from './context';
import { eventBus, _clearEventBusForTesting } from './event-bus';

describe('createModuleContext', () => {
	beforeEach(() => _clearEventBusForTesting());

	it('emit forwards namespaced event to bus', () => {
		const ctx = createModuleContext('inst-1', 'deck');
		const handler = vi.fn();
		eventBus.on('inst-1:play', handler);
		ctx.emit('play', { track: 'x' });
		expect(handler).toHaveBeenCalledWith({ track: 'x' });
	});

	it('on subscribes to namespaced event on bus', () => {
		const ctx = createModuleContext('inst-1', 'deck');
		const handler = vi.fn();
		ctx.on('play', handler);
		eventBus.emit('inst-1:play', { track: 'x' });
		expect(handler).toHaveBeenCalledWith({ track: 'x' });
	});

	it('on returns an unsubscribe function', () => {
		const ctx = createModuleContext('inst-1', 'deck');
		const unsubscribe = ctx.on('play', vi.fn());
		expect(typeof unsubscribe).toBe('function');
	});

	it('log.info calls console.info with module prefix', () => {
		const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
		const ctx = createModuleContext('inst-1', 'deck');
		ctx.log.info('hello');
		expect(spy).toHaveBeenCalledWith('[deck:inst-1]', 'hello');
		spy.mockRestore();
	});

	it('log.warn calls console.warn with module prefix', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const ctx = createModuleContext('inst-1', 'deck');
		ctx.log.warn('warning');
		expect(spy).toHaveBeenCalledWith('[deck:inst-1]', 'warning');
		spy.mockRestore();
	});

	it('log.error calls console.error with module prefix', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const ctx = createModuleContext('inst-1', 'deck');
		ctx.log.error('oops');
		expect(spy).toHaveBeenCalledWith('[deck:inst-1]', 'oops');
		spy.mockRestore();
	});
});
