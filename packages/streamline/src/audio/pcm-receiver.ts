import type { PcmMessage } from '@streamline/shared';

const consumers = new Map<string, (buffer: ArrayBuffer) => void>();
let dropoutCount = 0;

export function handlePcmMessage(msg: PcmMessage): void {
	/* v8 ignore next -- @preserve: null buffer / zero frames guard not exercised in unit tests */
	if (!msg.buffer || msg.frames === 0) return;

	const targets = msg.encoderTargets.length > 0 ? msg.encoderTargets : [...consumers.keys()];

	for (const id of targets) {
		const write = consumers.get(id);
		if (write) {
			write(msg.buffer.slice(0));
		} else {
			dropoutCount++;
		}
	}
}

export function registerEncoderConsumer(id: string, write: (buf: ArrayBuffer) => void): void {
	consumers.set(id, write);
}

export function unregisterEncoderConsumer(id: string): void {
	consumers.delete(id);
}

export function getDropoutCount(): number {
	return dropoutCount;
}
