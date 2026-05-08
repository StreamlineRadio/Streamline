import type { Component } from 'svelte';
import type { AudioCapability, MethodSpec, ModuleContext, StateSpec } from '@streamline/shared';

export interface ModuleManifest {
	id: string;
	displayName: string;
	version: string;
	hostApi: string;
	kind: 'window' | 'headless';
	singleton: boolean;
	produces: AudioCapability[];
	consumes: AudioCapability[];
	exposes: Record<string, MethodSpec>;
	publishes: Record<string, StateSpec>;
	subscribes: string[];
	ui?: Component<{ instanceId: string }>;
	settingsUi?: Component;
	defaultWidth?: number;
	defaultHeight?: number;
	minWidth?: number;
	minHeight?: number;
	defaultSettings?: Record<string, unknown>;
	init?: (moduleContext: ModuleContext) => Promise<void>;
	destroy?: (moduleContext: ModuleContext) => Promise<void>;
}
