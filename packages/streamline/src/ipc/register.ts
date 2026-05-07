import { registerSystemHandlers } from './handlers/system';
import { registerSettingsHandlers } from './handlers/settings';
import { registerLayoutHandlers } from './handlers/layout';
import { registerSecretHandlers } from './handlers/secret';
import { registerHotkeyHandlers } from './handlers/hotkeys';
import { registerEncoderHandlers } from './handlers/encoder';

export function registerAllHandlers(): void {
	registerSystemHandlers();
	registerSettingsHandlers();
	registerLayoutHandlers();
	registerSecretHandlers();
	registerHotkeyHandlers();
	registerEncoderHandlers();
	// Library handlers registered after their subsystem is initialized
}
