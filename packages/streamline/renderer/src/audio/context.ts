let _ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
	if (!_ctx) {
		_ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
	}
	return _ctx;
}

export async function resumeAudioContext(): Promise<void> {
	const ctx = getAudioContext();
	if (ctx.state === 'suspended') {
		await ctx.resume();
	}
}
