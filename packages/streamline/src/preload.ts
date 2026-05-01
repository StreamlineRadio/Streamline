import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('streamline', {
	platform: process.platform
});
