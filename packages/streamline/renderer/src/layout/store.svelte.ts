import type { Layout } from '@streamline/shared';

let activeLayout = $state<Layout | null>(null);

export const layoutStore = {
	get active() {
		return activeLayout;
	},
	set(layout: Layout) {
		activeLayout = layout;
	},
	updateInstance(id: string, patch: Partial<Layout['instances'][number]>): void {
		if (!activeLayout) return;
		activeLayout = {
			...activeLayout,
			instances: activeLayout.instances.map((inst) =>
				inst.id === id ? { ...inst, ...patch } : inst
			)
		};
	}
};
