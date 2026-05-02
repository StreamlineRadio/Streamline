export const IPC = {
	// Library
	LIBRARY_SCAN_FOLDER: 'library:scanFolder',
	LIBRARY_SEARCH: 'library:search',
	LIBRARY_GET_SONG: 'library:getSong',
	LIBRARY_ADD_FOLDER: 'library:addFolder',
	LIBRARY_LIST_FOLDERS: 'library:listFolders',
	LIBRARY_SCAN_PROGRESS: 'library:scanProgress',
	LIBRARY_SAVE_WAVEFORM: 'library:saveWaveform',
	LIBRARY_LOAD_WAVEFORM: 'library:loadWaveform',
	LIBRARY_READ_AUDIO_FILE: 'library:readAudioFile',
	// Encoder
	ENCODER_START: 'encoder:start',
	ENCODER_STOP: 'encoder:stop',
	ENCODER_GET_STATUS: 'encoder:getStatus',
	ENCODER_STATUS_PUSH: 'encoder:statusPush',
	ENCODER_UPDATE_METADATA: 'encoder:updateMetadata',
	ENCODER_LIST_CONFIGS: 'encoder:listConfigs',
	ENCODER_SAVE_CONFIG: 'encoder:saveConfig',
	ENCODER_DELETE_CONFIG: 'encoder:deleteConfig',
	// Layout
	LAYOUT_SAVE: 'layout:save',
	LAYOUT_LOAD: 'layout:load',
	LAYOUT_LIST: 'layout:list',
	LAYOUT_EXPORT: 'layout:export',
	LAYOUT_IMPORT: 'layout:import',
	// Secret
	SECRET_SET: 'secret:set',
	SECRET_DELETE: 'secret:delete',
	// System
	SYSTEM_OPEN_EXTERNAL: 'system:openExternal',
	SYSTEM_SHOW_ITEM_IN_FOLDER: 'system:showItemInFolder',
	SYSTEM_OPEN_LOG_FOLDER: 'system:openLogFolder',
	SYSTEM_GET_APP_VERSION: 'system:getAppVersion',
	SYSTEM_GET_CPU_USAGE: 'system:getCpuUsage',
	SYSTEM_READ_AUDIO_FILE: 'system:readAudioFile',
	SYSTEM_SAVE_WAVEFORM: 'system:saveWaveform',
	SYSTEM_LOAD_WAVEFORM: 'system:loadWaveform',
	SYSTEM_SELECT_FILE: 'system:selectFile',
	SYSTEM_SELECT_FOLDER: 'system:selectFolder',
	// Settings
	SETTINGS_GET: 'settings:get',
	SETTINGS_SET: 'settings:set',
	// Audio port
	AUDIO_PORT: 'audio:port'
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
