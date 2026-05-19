export type DeckState = 'unloaded' | 'loading' | 'loaded';

export interface DeckStatePayload {
	state: DeckState;
}

export interface DeckRemainingPayload {
	remaining: number;
}

export interface DeckLoadFailedPayload {
	path: string;
	error: string;
}
