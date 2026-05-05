import type { ModuleContext } from '@streamline/shared';
import { eventBus } from './event-bus';

export function createModuleContext(instanceId: string, moduleId: string): ModuleContext {
	return {
		instanceId,
		moduleId,
		emit(event: string, payload: unknown): void {
			eventBus.emit(`${instanceId}:${event}`, payload);
		},
		on(event: string, handler: (payload: unknown) => void): () => void {
			return eventBus.on(`${instanceId}:${event}`, handler);
		},
		log: {
			info: (...args) => console.info(`[${moduleId}:${instanceId}]`, ...args),
			warn: (...args) => console.warn(`[${moduleId}:${instanceId}]`, ...args),
			error: (...args) => console.error(`[${moduleId}:${instanceId}]`, ...args)
		}
	};
}
