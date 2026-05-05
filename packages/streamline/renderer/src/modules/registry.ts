import type { ModuleManifest } from './manifest';

const registry = new Map<string, ModuleManifest>();

export function registerModule(manifest: ModuleManifest): void {
	if (registry.has(manifest.id)) {
		throw new Error(`Module '${manifest.id}' is already registered`);
	}
	registry.set(manifest.id, manifest);
}

export function getModule(id: string): ModuleManifest | undefined {
	return registry.get(id);
}

export function listModules(): ModuleManifest[] {
	return [...registry.values()];
}

// For test use only
export function _clearRegistryForTesting(): void {
	registry.clear();
}
