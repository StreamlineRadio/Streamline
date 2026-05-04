import { ipcMain } from 'electron';
import { eq } from 'drizzle-orm';
import { IPC } from '@streamline/shared';
import { getDb, schema } from '../../db';

export function registerSettingsHandlers(): void {
	ipcMain.handle(IPC.SETTINGS_GET, (_e, key: string) => {
		const row = getDb().select().from(schema.settings).where(eq(schema.settings.key, key)).get();
		return row?.value ?? null;
	});
	ipcMain.handle(IPC.SETTINGS_SET, (_e, key: string, value: string) => {
		getDb()
			.insert(schema.settings)
			.values({ key, value })
			.onConflictDoUpdate({
				target: schema.settings.key,
				set: { value }
			})
			.run();
	});
}
