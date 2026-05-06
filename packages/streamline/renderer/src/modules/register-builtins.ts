import { registerModule } from './registry';
import { mixerManifest } from './mixer/manifest';
import { localOutputManifest } from './local-output/manifest';
import { deckManifest } from './deck/manifest';
import { queueManifest } from './queue/manifest';
import { crossfaderManifest } from './crossfader/manifest';
import { createModuleContext } from './context';

export async function registerBuiltinModules(): Promise<void> {
	registerModule(mixerManifest);
	registerModule(localOutputManifest);
	registerModule(deckManifest);
	registerModule(queueManifest);
	registerModule(crossfaderManifest);
	// Initialize singleton headless modules immediately
	if (mixerManifest.init) {
		const ctx = createModuleContext('mixer-singleton', 'mixer');
		await mixerManifest.init(ctx);
	}
}
