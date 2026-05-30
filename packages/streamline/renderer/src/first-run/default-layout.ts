import type { Layout, ModuleInstanceRecord } from '@streamline/shared';

function makeInstance(
	moduleId: string,
	title: string,
	x: number,
	y: number,
	width: number,
	height: number,
	zIndex: number,
	settings: object = {}
): ModuleInstanceRecord {
	return {
		id: crypto.randomUUID(),
		layoutId: '',
		moduleId,
		title,
		x,
		y,
		width,
		height,
		zIndex,
		minimized: false,
		settingsJson: JSON.stringify(settings)
	};
}

export function buildDefaultLayout(): Layout {
	const id = crypto.randomUUID();
	const now = Date.now();
	const queueId = crypto.randomUUID();

	const deckA = makeInstance('deck', 'A', 20, 60, 420, 280, 1, { sendMetadata: true });
	const deckB = makeInstance('deck', 'B', 460, 60, 420, 280, 2, { sendMetadata: true });
	const deckAux = makeInstance('deck', 'Aux', 900, 60, 420, 280, 3, { sendMetadata: false });

	const queueInstance: ModuleInstanceRecord = {
		...makeInstance('queue', 'Main Queue', 20, 360, 320, 320, 4, {
			autoplay: false,
			linkedDeckIds: [deckA.id, deckB.id]
		}),
		id: queueId,
		layoutId: id
	};

	const instances: ModuleInstanceRecord[] = [
		deckA,
		deckB,
		deckAux,
		queueInstance,
		makeInstance('crossfader', '', 360, 360, 360, 220, 5),
		makeInstance('microphone', '', 740, 360, 280, 220, 6),
		makeInstance('encoders', '', 20, 700, 480, 260, 7),
		makeInstance('local-output', '', 520, 700, 300, 160, 8)
	];

	const finalInstances = instances.map((instance) => ({ ...instance, layoutId: id }));

	return {
		id,
		name: 'Default',
		isActive: true,
		createdAt: now,
		updatedAt: now,
		instances: finalInstances
	};
}
