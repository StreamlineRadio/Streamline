import type { ModuleManifest } from '../manifest';
import Deck from './Deck.svelte';

export const deckManifest: ModuleManifest = {
	id: 'deck',
	displayName: 'Deck',
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'window',
	singleton: false,
	produces: ['audio'],
	consumes: [],
	exposes: {
		loadSong: {
			description: 'Load a song by path',
			params: { path: 'string' },
			returns: 'Promise<void>'
		},
		play: { description: 'Start playback', params: {}, returns: 'void' },
		pause: { description: 'Pause playback', params: {}, returns: 'void' },
		seek: {
			description: 'Seek to position in seconds',
			params: { seconds: 'number' },
			returns: 'void'
		},
		setVolume: { description: 'Set volume 0-1', params: { value: 'number' }, returns: 'void' },
		fadeOut: {
			description: 'Fade to silence over durationMs',
			params: { durationMs: 'number' },
			returns: 'void'
		}
	},
	publishes: {
		currentSong: { description: 'Currently loaded song', type: 'Song | null' },
		position: { description: 'Playback position in seconds', type: 'number' },
		duration: { description: 'Track duration in seconds', type: 'number' },
		isPlaying: { description: 'Whether track is playing', type: 'boolean' },
		level: { description: 'Current RMS level dBFS', type: 'number' }
	},
	subscribes: [],
	defaultWidth: 420,
	defaultHeight: 280,
	ui: Deck
};
