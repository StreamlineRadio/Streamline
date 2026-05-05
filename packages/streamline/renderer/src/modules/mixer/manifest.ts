import type { ModuleManifest } from '../manifest';
import { initMixer, setMasterVolume, setSoftClipEnabled } from '../../audio/mixer-bridge';

export const mixerManifest: ModuleManifest = {
	id: 'mixer',
	displayName: 'Mixer',
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'headless',
	singleton: true,
	produces: [],
	consumes: ['audio'],
	exposes: {
		setMasterVolume: {
			description: 'Set master gain 0-1',
			params: { value: 'number' },
			returns: 'void'
		},
		setSoftClip: {
			description: 'Enable/disable soft clipper',
			params: { enabled: 'boolean' },
			returns: 'void'
		}
	},
	publishes: {
		masterLevel: { description: 'RMS level in dBFS', type: 'number' }
	},
	subscribes: [],
	async init(): Promise<void> {
		await initMixer();
	}
};

// Re-export for use by other modules
export { setMasterVolume, setSoftClipEnabled };
