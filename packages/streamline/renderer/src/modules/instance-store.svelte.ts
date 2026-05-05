import type { ModuleInstanceRecord } from '@streamline/shared';
import type { ModuleContext } from '@streamline/shared';
import { createModuleContext } from './context';

export interface ActiveInstance {
	record: ModuleInstanceRecord;
	context: ModuleContext;
}

const instances = $state<Map<string, ActiveInstance>>(new Map());

export const instanceStore = {
	get all() {
		return instances;
	},
	get(id: string) {
		return instances.get(id);
	},
	add(record: ModuleInstanceRecord): void {
		const context = createModuleContext(record.id, record.moduleId);
		instances.set(record.id, { record, context });
	},
	update(id: string, patch: Partial<ModuleInstanceRecord>): void {
		const existing = instances.get(id);
		if (!existing) return;
		instances.set(id, { ...existing, record: { ...existing.record, ...patch } });
	},
	remove(id: string): void {
		instances.delete(id);
	},
	bringToFront(id: string): void {
		const maxZ = Math.max(0, ...[...instances.values()].map((i) => i.record.zIndex));
		const existing = instances.get(id);
		if (!existing) return;
		instances.set(id, { ...existing, record: { ...existing.record, zIndex: maxZ + 1 } });
	}
};
