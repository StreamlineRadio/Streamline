import { describe, it, expect } from 'vitest';
import {
	snapSampleRate,
	formatSampleRateKhz,
	parseSampleRateKhz,
	MAX_SAMPLE_RATE_KHZ_INPUT
} from './sample-rate';

describe('snapSampleRate', () => {
	it('returns canonical rates unchanged', () => {
		expect(snapSampleRate(22050)).toBe(22050);
		expect(snapSampleRate(32000)).toBe(32000);
		expect(snapSampleRate(44100)).toBe(44100);
		expect(snapSampleRate(48000)).toBe(48000);
	});

	it('snaps to the closest canonical rate', () => {
		expect(snapSampleRate(45000)).toBe(44100);
		expect(snapSampleRate(47000)).toBe(48000);
		expect(snapSampleRate(20000)).toBe(22050);
	});
});

describe('formatSampleRateKhz', () => {
	it('renders integer kHz with a trailing .0', () => {
		expect(formatSampleRateKhz(48000)).toBe('48.0');
		expect(formatSampleRateKhz(32000)).toBe('32.0');
	});

	it('renders fractional kHz as decimals', () => {
		expect(formatSampleRateKhz(44100)).toBe('44.1');
		expect(formatSampleRateKhz(22050)).toBe('22.05');
	});
});

describe('parseSampleRateKhz', () => {
	it('parses kHz values into Hz', () => {
		expect(parseSampleRateKhz('44.1')).toBe(44100);
		expect(parseSampleRateKhz('48')).toBe(48000);
		expect(parseSampleRateKhz('22.05')).toBe(22050);
	});

	it('rejects Hz-typed values that would otherwise silently snap', () => {
		expect(parseSampleRateKhz('44100')).toBeNull();
		expect(parseSampleRateKhz('48000')).toBeNull();
	});

	it('rejects values just past the kHz input ceiling', () => {
		expect(parseSampleRateKhz(String(MAX_SAMPLE_RATE_KHZ_INPUT + 1))).toBeNull();
	});

	it('rejects non-positive, NaN, and empty input', () => {
		expect(parseSampleRateKhz('0')).toBeNull();
		expect(parseSampleRateKhz('-44.1')).toBeNull();
		expect(parseSampleRateKhz('abc')).toBeNull();
		expect(parseSampleRateKhz('')).toBeNull();
	});
});
