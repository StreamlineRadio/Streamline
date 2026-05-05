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
	defaultSettings?: Record<string, unknown>;
	init?: (ctx: ModuleContext) => Promise<void>;
	destroy?: (ctx: ModuleContext) => Promise<void>;
}
