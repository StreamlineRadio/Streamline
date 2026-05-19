export type DeckLifecycle = 'unloaded' | 'loading' | 'loaded';

export interface DeckStatePayload {
	lifecycle: DeckLifecycle;
}

export interface DeckRemainingPayload {
	remaining: number;
}

export interface DeckLoadFailedPayload {
	path: string;
	error: string;
}
