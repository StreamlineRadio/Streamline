export interface PcmMessage {
	buffer: ArrayBuffer;
	frames: number;
	sampleRate: 48000;
	channels: 2;
	encoderTargets: string[];
}
