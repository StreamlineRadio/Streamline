import { describe, it, expect, beforeEach } from 'vitest';
import {
	handlePcmMessage,
	registerEncoderConsumer,
	unregisterEncoderConsumer,
	getDropoutCount
} from './pcm-receiver';
import type { PcmMessage } from '@streamline/shared';

describe('pcm-receiver', () => {
	beforeEach(() => {
		unregisterEncoderConsumer('enc-1');
		unregisterEncoderConsumer('enc-2');
	});

	it('routes PCM to targeted encoder only', () => {
		const received: ArrayBuffer[] = [];
		registerEncoderConsumer('enc-1', (buf) => received.push(buf));
		registerEncoderConsumer('enc-2', () => {
			throw new Error('should not receive');
		});

		const buffer = new ArrayBuffer(480 * 2 * 4);
		const msg: PcmMessage = {
			buffer,
			frames: 480,
			sampleRate: 48000,
			channels: 2,
			encoderTargets: ['enc-1']
		};
		handlePcmMessage(msg);
		expect(received).toHaveLength(1);
	});

	it('broadcasts to all consumers when encoderTargets is empty', () => {
		const counts = { e1: 0, e2: 0 };
		registerEncoderConsumer('enc-1', () => counts.e1++);
		registerEncoderConsumer('enc-2', () => counts.e2++);

		const msg: PcmMessage = {
			buffer: new ArrayBuffer(100),
			frames: 10,
			sampleRate: 48000,
			channels: 2,
			encoderTargets: []
		};
		handlePcmMessage(msg);
		expect(counts).toEqual({ e1: 1, e2: 1 });
	});

	it('increments dropoutCount when target has no consumer', () => {
		const before = getDropoutCount();
		const msg: PcmMessage = {
			buffer: new ArrayBuffer(100),
			frames: 10,
			sampleRate: 48000,
			channels: 2,
			encoderTargets: ['no-such-enc']
		};
		handlePcmMessage(msg);
		expect(getDropoutCount()).toBe(before + 1);
	});

	it('getDropoutCount returns current dropout count', () => {
		expect(typeof getDropoutCount()).toBe('number');
	});
});
