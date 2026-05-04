import { MessageChannelMain, BrowserWindow } from 'electron';
import type { MessagePortMain } from 'electron';
import { log } from '../logging';
import { handlePcmMessage } from './pcm-receiver';

let mainPort: MessagePortMain | null = null;

export function createAudioPort(win: BrowserWindow): void {
	const { port1, port2 } = new MessageChannelMain();
	mainPort = port1;
	mainPort.start();
	mainPort.on('message', (event) => {
		const data = event.data;
		if (data?.buffer instanceof ArrayBuffer) {
			handlePcmMessage(data);
		}
	});
	// Transfer port2 to the renderer — must happen after webContents is ready
	win.webContents.on('did-finish-load', () => {
		win.webContents.postMessage('audio:port', null, [port2]);
		log.info('Audio MessagePort transferred to renderer');
	});
}

export function getMainPort(): MessagePortMain | null {
	return mainPort;
}
