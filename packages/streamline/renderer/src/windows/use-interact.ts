import interact from 'interactjs';
import type { Action } from 'svelte/action';

export interface InteractOptions {
	onMove: (dx: number, dy: number) => void;
	onResize: (width: number, height: number) => void;
	minWidth?: number;
	minHeight?: number;
}

export const useInteract: Action<HTMLElement, InteractOptions> = (node, initialOpts) => {
	let opts = initialOpts;

	// Getters keep the modifier reading the live opts after the action's update() runs.
	const minSize = {
		get width() {
			return opts.minWidth ?? 200;
		},
		get height() {
			return opts.minHeight ?? 150;
		}
	};

	const ic = interact(node)
		.draggable({
			allowFrom: '[data-drag-handle]',
			listeners: {
				move(event) {
					opts.onMove(event.dx, event.dy);
				}
			}
		})
		.resizable({
			edges: { right: true, bottom: true, left: true, top: false },
			ignoreFrom: '[data-modal]',
			listeners: {
				move(event) {
					const width = Math.max(event.rect.width, minSize.width);
					const height = Math.max(event.rect.height, minSize.height);
					opts.onResize(width, height);
				}
			},
			modifiers: [interact.modifiers.restrictSize({ min: minSize })]
		});

	return {
		update(newOpts: InteractOptions) {
			opts = newOpts;
		},
		destroy() {
			ic.unset();
		}
	};
};
