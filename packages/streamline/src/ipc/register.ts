import { registerSystemHandlers } from './handlers/system';
import { registerSettingsHandlers } from './handlers/settings';
import { registerLayoutHandlers } from './handlers/layout';
import { registerSecretHandlers } from './handlers/secret';
import { registerHotkeyHandlers } from './handlers/hotkeys';

export function registerAllHandlers(): void {
	registerSystemHandlers();
	registerSettingsHandlers();
	registerLayoutHandlers();
	registerSecretHandlers();
	registerHotkeyHandlers();
	// Library and encoder handlers registered after their subsystems are initialized
}
