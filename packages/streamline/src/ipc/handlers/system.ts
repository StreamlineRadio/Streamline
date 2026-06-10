import { ipcMain, app, shell } from 'electron';
import { join } from 'path';
import { IPC } from '@streamline/shared';

export function registerSystemHandlers(): void {
	ipcMain.handle(IPC.SYSTEM_GET_APP_VERSION, () => app.getVersion());
	ipcMain.handle(IPC.SYSTEM_OPEN_EXTERNAL, (_e, url: string) => {
		const parsed = new URL(url);
		if (!['https:', 'http:'].includes(parsed.protocol)) {
			throw new Error(`Blocked openExternal for protocol: ${parsed.protocol}`);
		}
		return shell.openExternal(url);
	});
	ipcMain.handle(IPC.SYSTEM_SHOW_ITEM_IN_FOLDER, (_e, path: string) =>
		shell.showItemInFolder(path)
	);
	ipcMain.handle(IPC.SYSTEM_OPEN_LOG_FOLDER, () =>
		shell.openPath(join(app.getPath('userData'), 'logs'))
	);
	ipcMain.handle(IPC.SYSTEM_GET_CPU_USAGE, () => process.getCPUUsage().percentCPUUsage);
	ipcMain.handle(IPC.SYSTEM_SELECT_FILE, async (_e, filters) => {
		const { dialog } = await import('electron');
		const result = await dialog.showOpenDialog({
			properties: ['openFile'],
			/* v8 ignore next -- @preserve: filters ?? [] fallback not reached; tests always provide filters */
			filters: filters ?? []
		});
		return result.canceled ? null : result.filePaths[0];
	});
	ipcMain.handle(IPC.SYSTEM_SELECT_FOLDER, async () => {
		const { dialog } = await import('electron');
		const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
		return result.canceled ? null : result.filePaths[0];
	});
	ipcMain.handle(IPC.SYSTEM_GET_DEFAULT_RECORDINGS_FOLDER, () =>
		join(app.getPath('music'), 'StreamlineRecordings')
	);
}
