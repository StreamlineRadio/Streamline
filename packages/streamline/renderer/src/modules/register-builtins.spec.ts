import { describe, it, expect, vi, beforeEach } from 'vitest';

const { registerModuleMock, mixerInitMock } = vi.hoisted(() => ({
	registerModuleMock: vi.fn(),
	mixerInitMock: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('./registry', () => ({ registerModule: registerModuleMock }));

vi.mock('./mixer/manifest', () => ({
	mixerManifest: { id: 'mixer', kind: 'headless', init: mixerInitMock }
}));
vi.mock('./local-output/manifest', () => ({
	localOutputManifest: { id: 'local-output', kind: 'window' }
}));
vi.mock('./deck/manifest', () => ({ deckManifest: { id: 'deck', kind: 'window' } }));
vi.mock('./queue/manifest', () => ({ queueManifest: { id: 'queue', kind: 'window' } }));
vi.mock('./crossfader/manifest', () => ({
	crossfaderManifest: { id: 'crossfader', kind: 'window' }
}));
vi.mock('./microphone/manifest', () => ({
	microphoneManifest: { id: 'microphone', kind: 'window' }
}));
vi.mock('./encoders/manifest', () => ({ encodersManifest: { id: 'encoders', kind: 'window' } }));
vi.mock('./context', () => ({
	createModuleContext: vi.fn().mockReturnValue({
		instanceId: 'mixer-singleton',
		moduleId: 'mixer'
	})
}));

import { registerBuiltinModules } from './register-builtins';

describe('registerBuiltinModules', () => {
	beforeEach(() => vi.clearAllMocks());

	it('registers all 7 builtin modules', async () => {
		await registerBuiltinModules();
		expect(registerModuleMock).toHaveBeenCalledTimes(7);
	});

	it('initialises the mixer singleton', async () => {
		await registerBuiltinModules();
		expect(mixerInitMock).toHaveBeenCalledOnce();
	});
});
