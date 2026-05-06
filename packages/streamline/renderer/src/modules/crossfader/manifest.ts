import type { ModuleManifest } from '../manifest';
import Crossfader from './Crossfader.svelte';

export const crossfaderManifest: ModuleManifest = {
	id: 'crossfader',
	displayName: 'Crossfader',
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'window',
	singleton: false,
	produces: [],
	consumes: [],
	exposes: {
		setPosition: {
			description: 'Set fader position -1..+1',
			params: { pos: 'number' },
			returns: 'void'
		},
		crossfadeNow: { description: 'Animate to opposite side', params: {}, returns: 'void' }
	},
	publishes: {
		position: { description: 'Fader position -1..+1', type: 'number' },
		isAnimating: { description: 'Whether crossfade is in progress', type: 'boolean' },
		leftDeckId: { description: 'Instance ID of left deck', type: 'string' },
		rightDeckId: { description: 'Instance ID of right deck', type: 'string' }
	},
	subscribes: [],
	defaultWidth: 360,
	defaultHeight: 260,
	ui: Crossfader
};
