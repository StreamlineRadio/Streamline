import { describe, it, expect, expectTypeOf } from 'vitest';
import { ENCODER_SAMPLE_RATES, formatExtension } from './encoder';
import type { EncoderConfig, EncoderStatus, EncoderFormat } from './encoder';

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
			'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'error' | 'stopped'
		>;
		type AssertNever = [UnhandledStatuses] extends [never] ? true : false;
		const _check: AssertNever = true;
		expect(_check).toBe(true);
	});
});

describe('formatExtension', () => {
	it('maps ogg-vorbis to ogg (not the codec name)', () => {
		expect(formatExtension('ogg-vorbis')).toBe('ogg');
	});

	it('returns the same string for codecs that match their extension', () => {
		const passthrough: EncoderFormat[] = ['mp3', 'aac', 'opus', 'flac'];
		for (const format of passthrough) {
			expect(formatExtension(format)).toBe(format);
		}
	});
});

describe('ENCODER_SAMPLE_RATES', () => {
	it('contains the canonical broadcast sample rates', () => {
		expect(ENCODER_SAMPLE_RATES).toEqual([22050, 32000, 44100, 48000]);
	});
});
