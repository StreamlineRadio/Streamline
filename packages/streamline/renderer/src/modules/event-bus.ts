type Handler = (payload: unknown) => void;
const listeners = new Map<string, Set<Handler>>();

export const eventBus = {
	emit(channel: string, payload: unknown): void {
		listeners.get(channel)?.forEach((h) => h(payload));
	},
	on(channel: string, handler: Handler): () => void {
		let set = listeners.get(channel);
		if (!set) {
			set = new Set();
			listeners.set(channel, set);
		}
		set.add(handler);
		return () => listeners.get(channel)?.delete(handler);
	}
};

export function _clearEventBusForTesting(): void {
	listeners.clear();
}
