const BATCH_FRAMES = 960; // 20ms at 48 kHz

class TapProcessor extends AudioWorkletProcessor {
	private bufA: Float32Array = new Float32Array(BATCH_FRAMES * 2); // stereo interleaved
	private bufB: Float32Array = new Float32Array(BATCH_FRAMES * 2);
	private active: Float32Array;
	private standby: Float32Array;
	private writePos = 0;

	constructor() {
		super();
		this.active = this.bufA;
		this.standby = this.bufB;
	}

	process(
		inputs: Float32Array[][],
		_outputs: Float32Array[][],
		_params: Record<string, Float32Array>
	): boolean {
		const input = inputs[0];
		if (!input || input.length < 2 || !input[0] || !input[1]) return true;

		const left = input[0]; // 128 samples per quantum
		const right = input[1];

		for (let i = 0; i < left.length; i++) {
			this.active[this.writePos * 2] = left[i];
			this.active[this.writePos * 2 + 1] = right[i];
			this.writePos++;

			if (this.writePos >= BATCH_FRAMES) {
				// Swap buffers and post
				const toSend = this.active;
				this.active = this.standby;
				this.standby = toSend;
				this.writePos = 0;

				// Slice once — use the same object in both the message and the transfer list
				const slice = toSend.buffer.slice(0);
				// Shape must match PcmMessage in @streamline/shared/src/audio/pcm-message.ts
				this.port.postMessage(
					{
						buffer: slice,
						frames: BATCH_FRAMES,
						sampleRate: sampleRate,
						channels: 2,
						encoderTargets: []
					},
					[slice]
				);
			}
		}
		return true;
	}
}

registerProcessor('tap-processor', TapProcessor);
