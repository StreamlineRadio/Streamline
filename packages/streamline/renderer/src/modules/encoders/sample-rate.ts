import { ENCODER_SAMPLE_RATES, type EncoderSampleRate } from '@streamline/shared';

// Upper bound for kHz-typed user input. 200 covers every standard rate FFmpeg
// supports (up to 192 kHz) with headroom; anything larger is almost certainly
// a Hz-typed value that would otherwise snap to the wrong canonical rate.
export const MAX_SAMPLE_RATE_KHZ_INPUT = 200;

export function snapSampleRate(value: number): EncoderSampleRate {
	if (ENCODER_SAMPLE_RATES.includes(value as EncoderSampleRate)) {
		return value as EncoderSampleRate;
	}
	return ENCODER_SAMPLE_RATES.reduce((closest, rate) =>
		Math.abs(rate - value) < Math.abs(closest - value) ? rate : closest
	);
}

export function formatSampleRateKhz(hz: number): string {
	const khz = hz / 1000;
	return Number.isInteger(khz) ? `${khz}.0` : String(khz);
}

export function parseSampleRateKhz(text: string): number | null {
	const khz = parseFloat(text);
	if (!Number.isFinite(khz) || khz <= 0 || khz > MAX_SAMPLE_RATE_KHZ_INPUT) return null;
	return Math.round(khz * 1000);
}
