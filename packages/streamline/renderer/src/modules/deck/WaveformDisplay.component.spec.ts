import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WaveformDisplay from './WaveformDisplay.svelte';

const fakeCtx = {
	clearRect: vi.fn(),
	fillRect: vi.fn(),
	beginPath: vi.fn(),
	moveTo: vi.fn(),
	lineTo: vi.fn(),
	stroke: vi.fn(),
	save: vi.fn(),
	restore: vi.fn(),
	fillStyle: '',
	strokeStyle: '',
	shadowColor: '',
	shadowBlur: 0,
	lineWidth: 0
} as unknown as CanvasRenderingContext2D;

describe('WaveformDisplay', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
	it('shows "Drop a file to load" when no peaks and song not loaded', () => {
		const { getByText } = render(WaveformDisplay, {
			peaks: null,
			position: 0,
			duration: 0,
			songLoaded: false,
			onSeek: vi.fn()
		});
		expect(getByText('Drop a file to load')).toBeTruthy();
	});

	it('shows loading state when songLoaded but no peaks', () => {
		const { getByText } = render(WaveformDisplay, {
			peaks: null,
			position: 0,
			duration: 100,
			songLoaded: true,
			onSeek: vi.fn()
		});
		expect(getByText('Loading waveform…')).toBeTruthy();
	});

	it('renders canvas when peaks provided', () => {
		const { container } = render(WaveformDisplay, {
			peaks: [0.5, 0.8],
			position: 0,
			duration: 10,
			songLoaded: true,
			onSeek: vi.fn()
		});
		expect(container.querySelector('canvas')).toBeTruthy();
	});

	it('calls onSeek with correct ratio when seekbar clicked', async () => {
		const onSeek = vi.fn();
		const { container } = render(WaveformDisplay, {
			peaks: null,
			position: 0,
			duration: 100,
			songLoaded: true,
			onSeek
		});
		const seekBar = container.querySelector('[role="slider"]') as HTMLElement;
		vi.spyOn(seekBar, 'getBoundingClientRect').mockReturnValue({
			width: 1000,
			left: 0,
			height: 0,
			top: 0,
			bottom: 0,
			right: 1000,
			x: 0,
			y: 0,
			toJSON: vi.fn()
		});
		await fireEvent.click(seekBar, { clientX: 500 });
		expect(onSeek).toHaveBeenCalledWith(50);
	});

	it('does not seek when duration is zero', async () => {
		const onSeek = vi.fn();
		const { container } = render(WaveformDisplay, {
			peaks: null,
			position: 0,
			duration: 0,
			songLoaded: true,
			onSeek
		});
		const seekBar = container.querySelector('[role="slider"]') as HTMLElement;
		await fireEvent.click(seekBar, { clientX: 50 });
		expect(onSeek).not.toHaveBeenCalled();
	});

	it('does not seek when seekbar width is zero', async () => {
		const onSeek = vi.fn();
		const { container } = render(WaveformDisplay, {
			peaks: null,
			position: 0,
			duration: 100,
			songLoaded: true,
			onSeek
		});
		const seekBar = container.querySelector('[role="slider"]') as HTMLElement;
		vi.spyOn(seekBar, 'getBoundingClientRect').mockReturnValue({
			width: 0,
			left: 0,
			height: 0,
			top: 0,
			bottom: 0,
			right: 0,
			x: 0,
			y: 0,
			toJSON: vi.fn()
		});
		await fireEvent.click(seekBar, { clientX: 50 });
		expect(onSeek).not.toHaveBeenCalled();
	});

	it('calls onSeek with position-5 on ArrowLeft', async () => {
		const onSeek = vi.fn();
		const { container } = render(WaveformDisplay, {
			peaks: null,
			position: 20,
			duration: 100,
			songLoaded: true,
			onSeek
		});
		const seekBar = container.querySelector('[role="slider"]') as HTMLElement;
		await fireEvent.keyDown(seekBar, { key: 'ArrowLeft' });
		expect(onSeek).toHaveBeenCalledWith(15);
	});

	it('calls onSeek with position+5 on ArrowRight', async () => {
		const onSeek = vi.fn();
		const { container } = render(WaveformDisplay, {
			peaks: null,
			position: 20,
			duration: 100,
			songLoaded: true,
			onSeek
		});
		const seekBar = container.querySelector('[role="slider"]') as HTMLElement;
		await fireEvent.keyDown(seekBar, { key: 'ArrowRight' });
		expect(onSeek).toHaveBeenCalledWith(25);
	});
});
