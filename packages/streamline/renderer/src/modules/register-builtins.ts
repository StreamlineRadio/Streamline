import { registerModule } from './registry';
import { mixerManifest } from './mixer/manifest';
import { createModuleContext } from './context';

export async function registerBuiltinModules(): Promise<void> {
	registerModule(mixerManifest);
	// Initialize singleton headless modules immediately
	if (mixerManifest.init) {
		const ctx = createModuleContext('mixer-singleton', 'mixer');
		await mixerManifest.init(ctx);
	}
}
