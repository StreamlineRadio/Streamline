export type AudioCapability = 'audio';

export interface MethodSpec {
	description: string;
	params: Record<string, string>;
	returns: string;
}

export interface StateSpec {
	description: string;
	type: string;
}

export interface ModuleContext {
	instanceId: string;
	moduleId: string;
	emit(event: string, payload: unknown): void;
	on(event: string, handler: (payload: unknown) => void): () => void;
	log: {
		info(...args: unknown[]): void;
		warn(...args: unknown[]): void;
		error(...args: unknown[]): void;
	};
}

// ModuleManifest lives in the renderer (references Svelte Component type)
// This file only exports the context interface and capability types
