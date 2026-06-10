import { ipcMain, BrowserWindow } from 'electron';
import { eq } from 'drizzle-orm';
import type { EncoderConfig } from '@streamline/shared';
import { IPC } from '@streamline/shared';
import { getDb, schema } from '../../db';
import { startEncoder, stopEncoder, getEncoderStatus } from '../../encoders/manager';

let _mainWindow: BrowserWindow | null = null;

export function setEncoderWindow(mainWindow: BrowserWindow | null): void {
	_mainWindow = mainWindow;
}

export function registerEncoderHandlers(): void {
	ipcMain.handle(IPC.ENCODER_LIST_CONFIGS, () =>
		getDb().select().from(schema.encoderConfigs).all()
	);

	ipcMain.handle(IPC.ENCODER_SAVE_CONFIG, (_e, config: EncoderConfig) => {
		getDb()
			.insert(schema.encoderConfigs)
			.values(config)
			.onConflictDoUpdate({ target: schema.encoderConfigs.id, set: config })
			.run();
	});

	ipcMain.handle(IPC.ENCODER_DELETE_CONFIG, (_e, id: string) => {
		stopEncoder(id);
		getDb().delete(schema.encoderConfigs).where(eq(schema.encoderConfigs.id, id)).run();
	});

	ipcMain.handle(IPC.ENCODER_START, (_e, config: EncoderConfig) => {
		if (!_mainWindow) throw new Error('No window available');
		return { id: startEncoder(config, _mainWindow) };
	});

	ipcMain.handle(IPC.ENCODER_STOP, (_e, id: string) => stopEncoder(id));

	ipcMain.handle(IPC.ENCODER_GET_STATUS, (_e, id: string) => getEncoderStatus(id));

	// Icecast metadata update via HTTP GET — implement when icecast-client.ts is added
	ipcMain.handle(IPC.ENCODER_UPDATE_METADATA, () => {});
}
