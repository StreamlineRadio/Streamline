import type { ModuleManifest } from '../manifest';
import Encoders from './Encoders.svelte';

export const encodersManifest: ModuleManifest = {
	id: 'encoders',
	displayName: 'Encoders',
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'window',
	singleton: false,
	produces: [],
	consumes: ['audio'],
	exposes: {},
	publishes: { activeCount: { description: 'Number of active encoders', type: 'number' } },
	subscribes: [],
	defaultWidth: 480,
	defaultHeight: 300,
	minWidth: 380,
	minHeight: 220,
	ui: Encoders
};
