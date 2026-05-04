import { ipcMain } from 'electron';
import { eq } from 'drizzle-orm';
import { IPC } from '@streamline/shared';
import type { Layout } from '@streamline/shared';
import { getDb, schema } from '../../db';

export function registerLayoutHandlers(): void {
	ipcMain.handle(IPC.LAYOUT_LIST, () => {
		const db = getDb();
		return db.select().from(schema.layouts).all();
	});

	ipcMain.handle(IPC.LAYOUT_LOAD, (_e, id: string): Layout | null => {
		const db = getDb();
		const layout = db.select().from(schema.layouts).where(eq(schema.layouts.id, id)).get();
		if (!layout) return null;
		const instances = db
			.select()
			.from(schema.moduleInstances)
			.where(eq(schema.moduleInstances.layoutId, id))
			.all();
		return { ...layout, instances };
	});

	ipcMain.handle(IPC.LAYOUT_SAVE, (_e, layout: Layout) => {
		const db = getDb();
		db.transaction(() => {
			db.insert(schema.layouts)
				.values({
					id: layout.id,
					name: layout.name,
					isActive: layout.isActive,
					createdAt: layout.createdAt,
					updatedAt: Date.now()
				})
				.onConflictDoUpdate({
					target: schema.layouts.id,
					set: { name: layout.name, isActive: layout.isActive, updatedAt: Date.now() }
				})
				.run();

			db.delete(schema.moduleInstances).where(eq(schema.moduleInstances.layoutId, layout.id)).run();
			for (const inst of layout.instances) {
				db.insert(schema.moduleInstances).values(inst).run();
			}
		})();
	});

	ipcMain.handle(IPC.LAYOUT_EXPORT, (_e, id: string): string => {
		const db = getDb();
		const layout = db.select().from(schema.layouts).where(eq(schema.layouts.id, id)).get();
		if (!layout) throw new Error(`Layout ${id} not found`);
		const instances = db
			.select()
			.from(schema.moduleInstances)
			.where(eq(schema.moduleInstances.layoutId, id))
			.all();
		return JSON.stringify({ ...layout, instances }, null, 2);
	});

	ipcMain.handle(IPC.LAYOUT_IMPORT, (_e, json: string): Layout => {
		const layout = JSON.parse(json) as Layout;
		layout.id = crypto.randomUUID();
		layout.createdAt = Date.now();
		layout.updatedAt = Date.now();
		layout.isActive = false;
		for (const inst of layout.instances) {
			inst.id = crypto.randomUUID();
			inst.layoutId = layout.id;
		}
		return layout;
	});
}
