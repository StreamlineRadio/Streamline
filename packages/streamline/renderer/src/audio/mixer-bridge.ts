import { getAudioContext } from './context';
import { TAP_PROCESSOR_NAME } from '@streamline/audio-worklet';
import { sendPcm } from './port';
import tapProcessorUrl from '@streamline/audio-worklet/tap-processor?url';

let masterBus: GainNode | null = null;
let softClipper: WaveShaperNode | null = null;
let tapNode: AudioWorkletNode | null = null;

export function getMasterBus(): GainNode {
	/* v8 ignore next 2 — masterBus always null in tests; Web Audio not available in jsdom */
	if (!masterBus) throw new Error('Mixer not initialized — call initMixer() first');
	return masterBus;
}

export function connectToMaster(source: AudioNode): void {
	source.connect(getMasterBus());
}

export async function initMixer(): Promise<void> {
	const audioCtx = getAudioContext();
	masterBus = audioCtx.createGain();
	masterBus.gain.value = 1.0;

	// Soft clipper (tanh curve, 256-point WaveShaper)
	softClipper = audioCtx.createWaveShaper();
	const curve = new Float32Array(256);
	for (let i = 0; i < 256; i++) {
		const x = (i * 2) / (256 - 1) - 1;
		curve[i] = Math.tanh(x * 2);
	}
	softClipper.curve = curve;
	softClipper.oversample = '4x';

	// Load tap worklet and wire up PCM forwarding
	await audioCtx.audioWorklet.addModule(tapProcessorUrl);
	tapNode = new AudioWorkletNode(audioCtx, TAP_PROCESSOR_NAME);
	tapNode.port.onmessage = (e: MessageEvent) => {
		sendPcm(e.data.buffer, e.data.frames, e.data.encoderTargets);
	};

	// Chain: masterBus → softClipper → tapNode → destination
	masterBus.connect(softClipper);
	softClipper.connect(tapNode);
	tapNode.connect(audioCtx.destination);
}

export function setSoftClipEnabled(enabled: boolean): void {
	if (!masterBus || !softClipper || !tapNode) return;
	// Use targeted disconnects to avoid severing LocalOutput gainNode connections
	try {
		masterBus.disconnect(softClipper);
	} catch {
		/* not connected */
	}
	try {
		masterBus.disconnect(tapNode);
	} catch {
		/* not connected */
	}
	if (enabled) {
		masterBus.connect(softClipper);
		softClipper.connect(tapNode);
	} else {
		masterBus.connect(tapNode);
	}
	tapNode.connect(getAudioContext().destination);
}

export function setMasterVolume(value: number): void {
	/* v8 ignore next — masterBus always null in tests; Web Audio not available in jsdom */
	if (masterBus) masterBus.gain.value = Math.max(0, Math.min(1, value));
}
