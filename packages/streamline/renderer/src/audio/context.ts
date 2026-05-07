let _audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
	if (!_audioCtx) {
		_audioCtx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
	}
	return _audioCtx;
}

export async function resumeAudioContext(): Promise<void> {
	const audioCtx = getAudioContext();
	if (audioCtx.state === 'suspended') {
		await audioCtx.resume();
	}
}
