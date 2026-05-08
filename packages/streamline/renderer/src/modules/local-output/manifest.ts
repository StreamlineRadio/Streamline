import type { ModuleManifest } from '../manifest';
import LocalOutput from './LocalOutput.svelte';

export const localOutputManifest: ModuleManifest = {
	id: 'local-output',
	displayName: 'Local Output',
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'window',
	singleton: false,
	produces: [],
	consumes: ['audio'],
	exposes: {},
	publishes: {},
	subscribes: [],
	defaultWidth: 300,
	defaultHeight: 160,
	minWidth: 240,
	minHeight: 155,
	ui: LocalOutput
};
