import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { StreamlineWindowApi, TypedIpcApi } from '@streamline/shared';
import { IPC } from '@streamline/shared';

const api: TypedIpcApi = {
	library: {
		scanFolder: (path) => ipcRenderer.invoke(IPC.LIBRARY_SCAN_FOLDER, path),
		addFolder: (path) => ipcRenderer.invoke(IPC.LIBRARY_ADD_FOLDER, path),
		listFolders: () => ipcRenderer.invoke(IPC.LIBRARY_LIST_FOLDERS),
		search: (query) => ipcRenderer.invoke(IPC.LIBRARY_SEARCH, query),
		getSong: (id) => ipcRenderer.invoke(IPC.LIBRARY_GET_SONG, id),
		readAudioFile: (path) => ipcRenderer.invoke(IPC.LIBRARY_READ_AUDIO_FILE, path),
		saveWaveform: (hash, peaks) => ipcRenderer.invoke(IPC.LIBRARY_SAVE_WAVEFORM, hash, peaks),
		loadWaveform: (hash) => ipcRenderer.invoke(IPC.LIBRARY_LOAD_WAVEFORM, hash)
	},
	encoder: {
		start: (config) => ipcRenderer.invoke(IPC.ENCODER_START, config),
		stop: (id) => ipcRenderer.invoke(IPC.ENCODER_STOP, id),
		getStatus: (id) => ipcRenderer.invoke(IPC.ENCODER_GET_STATUS, id),
		listConfigs: () => ipcRenderer.invoke(IPC.ENCODER_LIST_CONFIGS),
		saveConfig: (config) => ipcRenderer.invoke(IPC.ENCODER_SAVE_CONFIG, config),
		deleteConfig: (id) => ipcRenderer.invoke(IPC.ENCODER_DELETE_CONFIG, id),
		updateMetadata: (song) => ipcRenderer.invoke(IPC.ENCODER_UPDATE_METADATA, song)
	},
	layout: {
		save: (layout) => ipcRenderer.invoke(IPC.LAYOUT_SAVE, layout),
		load: (id) => ipcRenderer.invoke(IPC.LAYOUT_LOAD, id),
		list: () => ipcRenderer.invoke(IPC.LAYOUT_LIST),
		exportJson: (id) => ipcRenderer.invoke(IPC.LAYOUT_EXPORT, id),
		importJson: (json) => ipcRenderer.invoke(IPC.LAYOUT_IMPORT, json)
	},
	secret: {
		set: (ref, value) => ipcRenderer.invoke(IPC.SECRET_SET, ref, value),
		delete: (ref) => ipcRenderer.invoke(IPC.SECRET_DELETE, ref)
	},
	system: {
		openExternal: (url) => ipcRenderer.invoke(IPC.SYSTEM_OPEN_EXTERNAL, url),
		showItemInFolder: (path) => ipcRenderer.invoke(IPC.SYSTEM_SHOW_ITEM_IN_FOLDER, path),
		openLogFolder: () => ipcRenderer.invoke(IPC.SYSTEM_OPEN_LOG_FOLDER),
		getAppVersion: () => ipcRenderer.invoke(IPC.SYSTEM_GET_APP_VERSION),
		getCpuUsage: () => ipcRenderer.invoke(IPC.SYSTEM_GET_CPU_USAGE),
		selectFile: (filters) => ipcRenderer.invoke(IPC.SYSTEM_SELECT_FILE, filters),
		selectFolder: () => ipcRenderer.invoke(IPC.SYSTEM_SELECT_FOLDER)
	},
	settings: {
		get: (key) => ipcRenderer.invoke(IPC.SETTINGS_GET, key),
		set: (key, value) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value)
	},
	hotkeys: {
		list: () => ipcRenderer.invoke(IPC.HOTKEY_LIST),
		save: (binding) => ipcRenderer.invoke(IPC.HOTKEY_SAVE, binding),
		delete: (id) => ipcRenderer.invoke(IPC.HOTKEY_DELETE, id)
	}
};

const streamline: StreamlineWindowApi = {
	platform: process.platform,
	api,
	getPathForFile: (file: File) => webUtils.getPathForFile(file),
	onAudioPort: (cb: (port: MessagePort) => void) =>
		ipcRenderer.on(IPC.AUDIO_PORT, (event) => {
			if (event.ports[0]) cb(event.ports[0]);
		}),
	onEncoderStatus: (cb: (id: string, status: unknown) => void) =>
		ipcRenderer.on(IPC.ENCODER_STATUS_PUSH, (_e, id, status) => cb(id, status)),
	onScanProgress: (cb: (progress: unknown) => void) =>
		ipcRenderer.on(IPC.LIBRARY_SCAN_PROGRESS, (_e, progress) => cb(progress))
};

contextBridge.exposeInMainWorld('streamline', streamline);
