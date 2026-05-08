import { getAudioContext } from '../../audio/context';
import { connectToMaster } from '../../audio/mixer-bridge';

export interface DeckAudio {
	gainNode: GainNode;
	analyserNode: AnalyserNode;
	load(arrayBuffer: ArrayBuffer): Promise<void>;
	play(): void;
	pause(): void;
	stop(): void;
	seek(seconds: number): void;
	setVolume(value: number): void;
	fadeOut(durationMs: number): void;
	getPeaks(pixelWidth: number): number[];
	getPosition(): number;
	getDuration(): number;
	onEnded(cb: () => void): () => void;
	destroy(): void;
}

export function createDeckAudio(): DeckAudio {
	const audioCtx = getAudioContext();
	const gainNode = audioCtx.createGain();
	const analyserNode = audioCtx.createAnalyser();
	analyserNode.fftSize = 2048;
	analyserNode.smoothingTimeConstant = 0.8;

	gainNode.connect(analyserNode);
	connectToMaster(gainNode);

	let source: AudioBufferSourceNode | null = null;
	let buffer: AudioBuffer | null = null;
	let startTime = 0;
	let pauseOffset = 0;
	let isPlaying = false;
	let endedCallbacks: (() => void)[] = [];

	function stopSource() {
		if (source) {
			source.onended = null;
			source.stop();
			source.disconnect();
			source = null;
		}
		isPlaying = false;
		pauseOffset = 0;
	}

	return {
		gainNode,
		analyserNode,

		async load(arrayBuffer: ArrayBuffer): Promise<void> {
			gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
			gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
			stopSource();
			buffer = await audioCtx.decodeAudioData(arrayBuffer);
		},

		play(): void {
			if (!buffer || isPlaying) return;
			source = audioCtx.createBufferSource();
			source.buffer = buffer;
			source.connect(gainNode);
			source.onended = () => {
				if (isPlaying) {
					isPlaying = false;
					source = null;
					endedCallbacks.forEach((cb) => cb());
				}
			};
			startTime = audioCtx.currentTime - pauseOffset;
			source.start(0, pauseOffset);
			isPlaying = true;
		},

		pause(): void {
			if (!isPlaying || !source) return;
			pauseOffset = audioCtx.currentTime - startTime;
			source.stop();
			isPlaying = false;
		},

		stop(): void {
			gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
			gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
			stopSource();
			buffer = null;
		},

		seek(seconds: number): void {
			const wasPlaying = isPlaying;
			if (isPlaying && source) {
				source.stop();
				isPlaying = false;
			}
			pauseOffset = Math.max(0, Math.min(seconds, buffer?.duration ?? 0));
			if (wasPlaying) this.play();
		},

		setVolume(value: number): void {
			gainNode.gain.value = Math.max(0, Math.min(1, value));
		},

		fadeOut(durationMs: number): void {
			const tc = durationMs / 1000 / 3;
			gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, tc);
		},

		getPeaks(pixelWidth: number): number[] {
			if (!buffer) return [];
			const peaks: number[] = new Array(pixelWidth);
			const samplesPerPixel = Math.floor(buffer.length / pixelWidth);
			for (let i = 0; i < pixelWidth; i++) {
				let max = 0;
				const start = i * samplesPerPixel;
				for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
					const channelData = buffer.getChannelData(ch);
					for (let j = 0; j < samplesPerPixel; j++) {
						max = Math.max(max, Math.abs(channelData[start + j] ?? 0));
					}
				}
				peaks[i] = max;
			}
			return peaks;
		},

		getPosition(): number {
			if (!buffer) return 0;
			if (isPlaying) return audioCtx.currentTime - startTime;
			return pauseOffset;
		},

		getDuration(): number {
			return buffer?.duration ?? 0;
		},

		onEnded(cb: () => void): () => void {
			endedCallbacks.push(cb);
			return () => {
				endedCallbacks = endedCallbacks.filter((f) => f !== cb);
			};
		},

		destroy(): void {
			stopSource();
			gainNode.disconnect();
			analyserNode.disconnect();
		}
	};
}
