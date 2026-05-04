let _port: MessagePort | null = null;

export function initAudioPort(): void {
	(
		window as unknown as { streamline: { onAudioPort: (cb: (port: MessagePort) => void) => void } }
	).streamline.onAudioPort((port) => {
		_port = port;
	});
}

export function getAudioPort(): MessagePort | null {
	return _port;
}

export function sendPcm(buffer: ArrayBuffer, frames: number, encoderTargets: string[] = []): void {
	if (!_port) return;
	_port.postMessage({ buffer, frames, sampleRate: 48000, channels: 2, encoderTargets }, [buffer]);
}
