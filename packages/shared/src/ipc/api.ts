import type { Song } from '../types/song';
import type { EncoderConfig, EncoderStatus } from '../types/encoder';
import type { Layout } from '../types/layout';
import type { HotkeyBinding } from '../types/hotkey';

export interface StreamlineWindowApi {
	platform: string;
	api: TypedIpcApi;
	getPathForFile(file: File): string;
	onEncoderStatus(cb: (id: string, status: unknown) => void): () => void;
	onScanProgress(cb: (progress: unknown) => void): void;
}

export interface TypedIpcApi {
	library: {
		scanFolder(path: string): Promise<void>;
		addFolder(path: string): Promise<void>;
		listFolders(): Promise<string[]>;
		search(query: string): Promise<Song[]>;
		getSong(id: string): Promise<Song | null>;
		getSongByPath(path: string): Promise<Song | null>;
		getFileMetadata(path: string): Promise<Song | null>;
		readAudioFile(path: string): Promise<ArrayBuffer>;
		getCoverArt(path: string): Promise<string | null>;
		saveWaveform(hash: string, peaks: number[]): Promise<void>;
		loadWaveform(hash: string): Promise<number[] | null>;
	};
	encoder: {
		start(config: EncoderConfig): Promise<{ id: string }>;
		stop(id: string): Promise<void>;
		getStatus(id: string): Promise<EncoderStatus>;
		listConfigs(): Promise<EncoderConfig[]>;
		saveConfig(config: EncoderConfig): Promise<void>;
		deleteConfig(id: string): Promise<void>;
		updateMetadata(song: Pick<Song, 'title' | 'artist'>): Promise<void>;
	};
	layout: {
		save(layout: Layout): Promise<void>;
		load(id: string): Promise<Layout>;
		list(): Promise<Layout[]>;
		exportJson(id: string): Promise<string>;
		importJson(json: string): Promise<Layout>;
	};
	secret: {
		set(ref: string, value: string): Promise<void>;
		delete(ref: string): Promise<void>;
	};
	system: {
		openExternal(url: string): Promise<void>;
		showItemInFolder(path: string): Promise<void>;
		openLogFolder(): Promise<void>;
		getAppVersion(): Promise<string>;
		getCpuUsage(): Promise<number>;
		selectFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null>;
		selectFolder(): Promise<string | null>;
		getDefaultRecordingsFolder(): Promise<string>;
	};
	settings: {
		get(key: string): Promise<string | null>;
		set(key: string, value: string): Promise<void>;
	};
	hotkeys: {
		list(): Promise<HotkeyBinding[]>;
		save(binding: HotkeyBinding): Promise<void>;
		delete(id: string): Promise<void>;
	};
}
