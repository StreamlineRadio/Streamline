import { describe, it, expect, expectTypeOf } from 'vitest';
import type { EncoderConfig, EncoderStatus } from './encoder';

describe('EncoderConfig', () => {
	it('accepts valid icecast config', () => {
		const config: EncoderConfig = {
			id: 'test-uuid',
			name: 'Test Stream',
			type: 'icecast',
			format: 'mp3',
			bitrateKbps: 128,
			sampleRate: 48000,
			channels: 2,
			host: 'localhost',
			port: 8000,
			mount: '/stream',
			username: 'source',
			passwordRef: 'ref:123'
		};
		expectTypeOf(config).toMatchTypeOf<EncoderConfig>();
	});

	it('EncoderStatus is exhaustive over known status values', () => {
		type UnhandledStatuses = Exclude<
			EncoderStatus['status'],
			'idle' | 'connecting' | 'streaming' | 'error' | 'stopped'
		>
		type AssertNever = [UnhandledStatuses] extends [never] ? true : false
		const _check: AssertNever = true
		expect(_check).toBe(true)
	});
});
