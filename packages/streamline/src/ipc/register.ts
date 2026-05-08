import { ipcMain } from 'electron';
import { IPC } from '@streamline/shared';
import { registerSystemHandlers } from './handlers/system';
import { registerSettingsHandlers } from './handlers/settings';
import { registerLayoutHandlers } from './handlers/layout';
import { registerSecretHandlers } from './handlers/secret';
import { registerHotkeyHandlers } from './handlers/hotkeys';
import { registerEncoderHandlers } from './handlers/encoder';
import { registerLibraryHandlers } from './handlers/library';

export function registerAllHandlers(): void {
	Object.values(IPC).forEach((channel) => ipcMain.removeHandler(channel));
	registerSystemHandlers();
	registerSettingsHandlers();
	registerLayoutHandlers();
	registerSecretHandlers();
	registerHotkeyHandlers();
	registerEncoderHandlers();
	registerLibraryHandlers();
}
