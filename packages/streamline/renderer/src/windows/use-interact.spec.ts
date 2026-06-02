import { describe, it, expect, vi, beforeEach } from 'vitest';

const { capturedDragMove, capturedResizeMove, unsetMock } = vi.hoisted(() => ({
	capturedDragMove: [] as Array<(e: { dx: number; dy: number }) => void>,
	capturedResizeMove: [] as Array<(e: { rect: { width: number; height: number } }) => void>,
	unsetMock: vi.fn()
}));

vi.mock('interactjs', () => {
	const interactable = {
		draggable: vi
			.fn()
			.mockImplementation(
				({ listeners }: { listeners: { move: (e: { dx: number; dy: number }) => void } }) => {
					capturedDragMove.push(listeners.move);
					return interactable;
				}
			),
		resizable: vi
			.fn()
			.mockImplementation(
				({
					listeners
				}: {
					listeners: { move: (e: { rect: { width: number; height: number } }) => void };
				}) => {
					capturedResizeMove.push(listeners.move);
					return interactable;
				}
			),
		unset: unsetMock
	};
	const interactFn = vi.fn().mockReturnValue(interactable) as ReturnType<typeof vi.fn> & {
		modifiers: { restrictSize: ReturnType<typeof vi.fn> };
	};
	interactFn.modifiers = { restrictSize: vi.fn().mockReturnValue({}) };
	return { default: interactFn };
});

import { useInteract } from './use-interact';

describe('useInteract', () => {
	beforeEach(() => {
		capturedDragMove.length = 0;
		capturedResizeMove.length = 0;
		vi.clearAllMocks();
	});

	it('calls onMove when drag event fires', () => {
		const onMove = vi.fn();
		const onResize = vi.fn();
		const node = {} as HTMLElement;
		useInteract(node, { onMove, onResize });

		capturedDragMove[0]?.({ dx: 10, dy: 5 });
		expect(onMove).toHaveBeenCalledWith(10, 5);
	});

	it('calls onResize with clamped dimensions', () => {
		const onResize = vi.fn();
		const node = {} as HTMLElement;
		useInteract(node, { onMove: vi.fn(), onResize, minWidth: 300, minHeight: 200 });

		capturedResizeMove[0]?.({ rect: { width: 100, height: 50 } });
		expect(onResize).toHaveBeenCalledWith(300, 200);
	});

	it('destroy() calls ic.unset()', () => {
		const node = {} as HTMLElement;
		const action = useInteract(node, { onMove: vi.fn(), onResize: vi.fn() }) as {
			destroy?: () => void;
			update?: (opts: import('./use-interact').InteractOptions) => void;
		};
		action.destroy!();
		expect(unsetMock).toHaveBeenCalled();
	});

	it('update() swaps options so new callbacks are used', () => {
		const firstMove = vi.fn();
		const secondMove = vi.fn();
		const node = {} as HTMLElement;
		const action = useInteract(node, { onMove: firstMove, onResize: vi.fn() }) as {
			destroy?: () => void;
			update?: (opts: import('./use-interact').InteractOptions) => void;
		};
		action.update!({ onMove: secondMove, onResize: vi.fn() });

		capturedDragMove[capturedDragMove.length - 1]?.({ dx: 1, dy: 1 });
		expect(secondMove).toHaveBeenCalled();
		expect(firstMove).not.toHaveBeenCalled();
	});
});
