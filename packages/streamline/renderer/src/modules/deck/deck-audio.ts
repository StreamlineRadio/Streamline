import { getAudioContext } from '../../audio/context';
import { connectToMaster } from '../../audio/mixer-bridge';

export interface DeckAudio {
	gainNode: GainNode;
	analyserNode: AnalyserNode;
	load(arrayBuffer: ArrayBuffer): Promise<void>;
	play(): void;
	pause(): void;
	seek(seconds: number): void;
	setVolume(value: number): void;
	fadeOut(durationMs: number): void;
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

	return {
		gainNode,
		analyserNode,

		async load(arrayBuffer: ArrayBuffer): Promise<void> {
			gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
			gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
			if (source) {
				source.stop();
				source.disconnect();
				source = null;
			}
			buffer = await audioCtx.decodeAudioData(arrayBuffer);
			pauseOffset = 0;
			isPlaying = false;
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
			source?.stop();
			gainNode.disconnect();
			analyserNode.disconnect();
		}
	};
}
