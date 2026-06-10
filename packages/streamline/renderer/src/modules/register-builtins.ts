import { registerModule } from './registry';
import { mixerManifest } from './mixer/manifest';
import { localOutputManifest } from './local-output/manifest';
import { deckManifest } from './deck/manifest';
import { queueManifest } from './queue/manifest';
import { crossfaderManifest } from './crossfader/manifest';
import { microphoneManifest } from './microphone/manifest';
import { encodersManifest } from './encoders/manifest';
import { createModuleContext } from './context';

export async function registerBuiltinModules(): Promise<void> {
	registerModule(mixerManifest);
	registerModule(localOutputManifest);
	registerModule(deckManifest);
	registerModule(queueManifest);
	registerModule(crossfaderManifest);
	registerModule(microphoneManifest);
	registerModule(encodersManifest);
	// Initialize singleton headless modules immediately
	/* v8 ignore next -- @preserve: mixer manifest always defines init */
	if (mixerManifest.init) {
		const moduleContext = createModuleContext('mixer-singleton', 'mixer');
		await mixerManifest.init(moduleContext);
	}
}
