import { describe, it, expect } from 'vitest';
import { buildDefaultLayout } from './default-layout';

describe('buildDefaultLayout', () => {
	it('creates 8 module instances', () => {
		const layout = buildDefaultLayout();
		expect(layout.instances).toHaveLength(8);
	});

	it('includes two metadata-sending decks', () => {
		const layout = buildDefaultLayout();
		const sendingDecks = layout.instances.filter((instance) => {
			if (instance.moduleId !== 'deck') return false;
			const settings = JSON.parse(instance.settingsJson);
			return settings.sendMetadata === true;
		});
		expect(sendingDecks).toHaveLength(2);
	});

	it('includes one Aux deck with sendMetadata=false', () => {
		const layout = buildDefaultLayout();
		const aux = layout.instances.find(
			(instance) => instance.moduleId === 'deck' && instance.title === 'Aux'
		);
		expect(aux).toBeDefined();
		expect(JSON.parse(aux!.settingsJson).sendMetadata).toBe(false);
	});

	it('does not write acceptsFromQueueId on any deck', () => {
		const layout = buildDefaultLayout();
		for (const instance of layout.instances) {
			if (instance.moduleId !== 'deck') continue;
			const settings = JSON.parse(instance.settingsJson);
			expect(settings).not.toHaveProperty('acceptsFromQueueId');
		}
	});

	it('queue lists the two metadata-sending decks as linkedDeckIds', () => {
		const layout = buildDefaultLayout();
		const decks = layout.instances.filter((instance) => instance.moduleId === 'deck');
		const deckA = decks.find((deck) => deck.title === 'A')!;
		const deckB = decks.find((deck) => deck.title === 'B')!;
		const queue = layout.instances.find((instance) => instance.moduleId === 'queue')!;
		const settings = JSON.parse(queue.settingsJson);
		expect(settings.linkedDeckIds).toEqual(expect.arrayContaining([deckA.id, deckB.id]));
		expect(settings.linkedDeckIds).toHaveLength(2);
	});

	it('has isActive=true', () => {
		expect(buildDefaultLayout().isActive).toBe(true);
	});

	it('all instances have valid non-empty IDs', () => {
		const layout = buildDefaultLayout();
		for (const instance of layout.instances) {
			expect(instance.id).toBeTruthy();
			expect(instance.id).toHaveLength(36);
		}
	});
});
