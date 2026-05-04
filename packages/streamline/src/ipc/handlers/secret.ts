import { ipcMain, safeStorage } from 'electron';
import { eq } from 'drizzle-orm';
import { IPC } from '@streamline/shared';
import { getDb, schema } from '../../db';
import { log } from '../../logging';

export function registerSecretHandlers(): void {
	ipcMain.handle(IPC.SECRET_SET, (_e, ref: string, value: string) => {
		if (!safeStorage.isEncryptionAvailable()) {
			log.warn(
				'safeStorage: no system keyring — using basic text encryption. Install gnome-keyring or kwallet.'
			);
		}
		const encrypted = safeStorage.encryptString(value);
		const now = Date.now();
		getDb()
			.insert(schema.secrets)
			.values({ ref, encryptedBlob: encrypted, createdAt: now, updatedAt: now })
			.onConflictDoUpdate({
				target: schema.secrets.ref,
				set: { encryptedBlob: encrypted, updatedAt: now }
			})
			.run();
	});

	ipcMain.handle(IPC.SECRET_DELETE, (_e, ref: string) => {
		getDb().delete(schema.secrets).where(eq(schema.secrets.ref, ref)).run();
	});
}

export function getSecret(ref: string): string | null {
	const row = getDb().select().from(schema.secrets).where(eq(schema.secrets.ref, ref)).get();
	if (!row) return null;
	return safeStorage.decryptString(Buffer.from(row.encryptedBlob));
}
