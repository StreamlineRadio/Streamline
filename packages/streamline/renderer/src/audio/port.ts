import type { PcmMessage } from '@streamline/shared';

let _port: MessagePort | null = null;

export function initAudioPort(): void {
	window.addEventListener('streamline-audio-port', (event) => {
		const port = (event as MessageEvent).ports?.[0];
		if (port) {
			_port?.close();
			_port = port;
		}
	});
}

export function getAudioPort(): MessagePort | null {
	return _port;
}

export function sendPcm(buffer: ArrayBuffer, frames: number, encoderTargets: string[] = []): void {
	if (!_port) return;
	const message: PcmMessage = { buffer, frames, sampleRate: 48000, channels: 2, encoderTargets };
	_port.postMessage(message, [buffer]);
}
