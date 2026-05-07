import { describe, it, expect } from 'vitest';
import { ExponentialBackoff } from './reconnect';

describe('ExponentialBackoff', () => {
	it('produces correct sequence', () => {
		const b = new ExponentialBackoff(1000, 30000);
		expect(b.next()).toBe(1000);
		expect(b.next()).toBe(2000);
		expect(b.next()).toBe(4000);
		expect(b.next()).toBe(8000);
		expect(b.next()).toBe(16000);
		expect(b.next()).toBe(30000);
		expect(b.next()).toBe(30000); // capped
	});

	it('resets to base after reset()', () => {
		const b = new ExponentialBackoff(1000, 30000);
		b.next();
		b.next();
		b.next();
		b.reset();
		expect(b.next()).toBe(1000);
	});
});
