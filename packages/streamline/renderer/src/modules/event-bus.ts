type Handler = (payload: unknown) => void;
const listeners = new Map<string, Set<Handler>>();

export const eventBus = {
	emit(channel: string, payload: unknown): void {
		listeners.get(channel)?.forEach((h) => h(payload));
	},
	on(channel: string, handler: Handler): () => void {
		if (!listeners.has(channel)) listeners.set(channel, new Set());
		listeners.get(channel)!.add(handler);
		return () => listeners.get(channel)?.delete(handler);
	},
	off(channel: string, handler: Handler): void {
		listeners.get(channel)?.delete(handler);
	}
};
