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
			listeners: {
				move(event) {
					opts.onResize(event.rect.width, event.rect.height);
				}
			},
			modifiers: [
				interact.modifiers.restrictSize({
					min: { width: opts.minWidth ?? 200, height: opts.minHeight ?? 150 }
				})
			]
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
