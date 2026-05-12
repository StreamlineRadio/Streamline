import type { ModuleManifest } from '../manifest';
import Queue from './Queue.svelte';

export const queueManifest: ModuleManifest = {
	id: 'queue',
	displayName: 'Queue',
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'window',
	singleton: false,
	produces: [],
	consumes: [],
	exposes: {
		add: { description: 'Add song to queue', params: { song: 'Song' }, returns: 'void' },
		remove: { description: 'Remove item by id', params: { id: 'string' }, returns: 'void' },
		clear: { description: 'Clear all items', params: {}, returns: 'void' },
		pushToDeck: {
			description: 'Push next item to a specific deck',
			params: { deckId: 'string' },
			returns: 'void'
		}
	},
	publishes: {
		items: { description: 'Queue contents', type: 'QueueItem[]' }
	},
	subscribes: [],
	defaultWidth: 320,
	defaultHeight: 400,
	minWidth: 260,
	minHeight: 200,
	ui: Queue
};
