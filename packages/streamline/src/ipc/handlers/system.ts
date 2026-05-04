import { ipcMain, app, shell } from 'electron';
import { join } from 'path';
import { IPC } from '@streamline/shared';

export function registerSystemHandlers(): void {
	ipcMain.handle(IPC.SYSTEM_GET_APP_VERSION, () => app.getVersion());
	ipcMain.handle(IPC.SYSTEM_OPEN_EXTERNAL, (_e, url: string) => shell.openExternal(url));
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
			filters: filters ?? []
		});
		return result.canceled ? null : result.filePaths[0];
	});
	ipcMain.handle(IPC.SYSTEM_SELECT_FOLDER, async () => {
		const { dialog } = await import('electron');
		const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
		return result.canceled ? null : result.filePaths[0];
	});
	ipcMain.handle(IPC.LIBRARY_READ_AUDIO_FILE, async (_e, path: string) => {
		const { readFile } = await import('fs/promises');
		return readFile(path);
	});
	ipcMain.handle(IPC.LIBRARY_SAVE_WAVEFORM, async (_e, hash: string, peaks: number[]) => {
		const { writeFile, mkdir } = await import('fs/promises');
		const dir = join(app.getPath('userData'), 'waveforms');
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, `${hash}.json`), JSON.stringify(peaks));
	});
	ipcMain.handle(IPC.LIBRARY_LOAD_WAVEFORM, async (_e, hash: string) => {
		const { readFile } = await import('fs/promises');
		try {
			const data = await readFile(
				join(app.getPath('userData'), 'waveforms', `${hash}.json`),
				'utf8'
			);
			return JSON.parse(data);
		} catch {
			return null;
		}
	});
}
