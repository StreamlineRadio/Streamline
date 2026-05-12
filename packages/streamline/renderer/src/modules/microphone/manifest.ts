import type { ModuleManifest } from '../manifest';
import Microphone from './Microphone.svelte';

export const microphoneManifest: ModuleManifest = {
	id: 'microphone',
	displayName: 'Microphone',
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'window',
	singleton: false,
	produces: ['audio'],
	consumes: [],
	exposes: {},
	publishes: {
		isLive: { description: 'Whether mic is currently open', type: 'boolean' },
		level: { description: 'Input level dBFS', type: 'number' }
	},
	subscribes: [],
	defaultWidth: 280,
	defaultHeight: 340,
	minWidth: 220,
	minHeight: 260,
	ui: Microphone
};
