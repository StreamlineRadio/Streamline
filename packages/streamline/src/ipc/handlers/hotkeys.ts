import { ipcMain } from 'electron';
import { eq } from 'drizzle-orm';
import { IPC } from '@streamline/shared';
import type { HotkeyBinding } from '@streamline/shared';
import { getDb, schema } from '../../db';

export function registerHotkeyHandlers(): void {
	ipcMain.handle(IPC.HOTKEY_LIST, () => getDb().select().from(schema.hotkeys).all());
	ipcMain.handle(IPC.HOTKEY_SAVE, (_e, binding: HotkeyBinding) => {
		getDb()
			.insert(schema.hotkeys)
			.values(binding)
			.onConflictDoUpdate({
				target: schema.hotkeys.id,
				set: { action: binding.action, accelerator: binding.accelerator }
			})
			.run();
	});
	ipcMain.handle(IPC.HOTKEY_DELETE, (_e, id: string) => {
		getDb().delete(schema.hotkeys).where(eq(schema.hotkeys.id, id)).run();
	});
}
