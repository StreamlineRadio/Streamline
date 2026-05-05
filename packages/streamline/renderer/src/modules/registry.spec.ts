import { describe, it, expect, beforeEach } from 'vitest';
import { registerModule, getModule, listModules, _clearRegistryForTesting } from './registry';
import type { ModuleManifest } from './manifest';

const makeManifest = (id: string): ModuleManifest => ({
	id,
	displayName: id,
	version: '1.0.0',
	hostApi: '^1.0.0',
	kind: 'window',
	singleton: false,
	produces: [],
	consumes: [],
	exposes: {},
	publishes: {},
	subscribes: []
});

describe('module registry', () => {
	beforeEach(() => {
		_clearRegistryForTesting();
	});

	it('registers and retrieves a module', () => {
		registerModule(makeManifest('test-module'));
		expect(getModule('test-module')?.id).toBe('test-module');
	});

	it('throws when registering duplicate id', () => {
		registerModule(makeManifest('dup'));
		expect(() => registerModule(makeManifest('dup'))).toThrow('already registered');
	});

	it('lists all registered modules', () => {
		registerModule(makeManifest('a'));
		registerModule(makeManifest('b'));
		expect(listModules().map((m) => m.id)).toContain('a');
		expect(listModules().map((m) => m.id)).toContain('b');
	});
});
