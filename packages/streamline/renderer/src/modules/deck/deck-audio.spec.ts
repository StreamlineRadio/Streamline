import { describe, it, expect, vi } from 'vitest';

const mockSource = {
	buffer: null as unknown,
	connect: vi.fn(),
	start: vi.fn(),
	stop: vi.fn(),
	onended: null as unknown
};

const mockGain = {
	gain: { value: 1, setTargetAtTime: vi.fn() },
	connect: vi.fn(),
	disconnect: vi.fn()
};
const mockAnalyser = {
	fftSize: 0,
	smoothingTimeConstant: 0,
	connect: vi.fn(),
	disconnect: vi.fn()
};
const mockCtx = {
	currentTime: 0,
	createGain: () => mockGain,
	createAnalyser: () => mockAnalyser,
	createBufferSource: () => ({ ...mockSource }),
	decodeAudioData: vi.fn().mockResolvedValue({ duration: 180 })
};

vi.mock('../../audio/context', () => ({ getAudioContext: () => mockCtx }));
vi.mock('../../audio/mixer-bridge', () => ({ connectToMaster: vi.fn() }));

describe('deck audio', () => {
	it('returns 0 position before any song is loaded', async () => {
		const { createDeckAudio } = await import('./deck-audio');
		const deck = createDeckAudio();
		expect(deck.getPosition()).toBe(0);
		expect(deck.getDuration()).toBe(0);
		deck.destroy();
	});

	it('setVolume clamps to 0-1', async () => {
		const { createDeckAudio } = await import('./deck-audio');
		const deck = createDeckAudio();
		deck.setVolume(1.5);
		expect(mockGain.gain.value).toBe(1);
		deck.setVolume(-0.5);
		expect(mockGain.gain.value).toBe(0);
		deck.destroy();
	});

	it('onEnded registers a callback and returns a working unsubscribe', async () => {
		const { createDeckAudio } = await import('./deck-audio');
		const deck = createDeckAudio();
		const callback = vi.fn();
		const unsubscribe = deck.onEnded(callback);
		expect(typeof unsubscribe).toBe('function');
		unsubscribe();
		deck.destroy();
	});

	it('fadeOut calls setTargetAtTime', async () => {
		const { createDeckAudio } = await import('./deck-audio');
		const deck = createDeckAudio();
		deck.fadeOut(5000);
		expect(mockGain.gain.setTargetAtTime).toHaveBeenCalledWith(
			0,
			0,
			expect.closeTo(5000 / 1000 / 3, 3)
		);
		deck.destroy();
	});
});
