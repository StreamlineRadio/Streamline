/// <reference types="vite/client" />
import type { StreamlineWindowApi } from '@streamline/shared';

declare global {
	interface Window {
		streamline: StreamlineWindowApi;
	}
}

export {};
