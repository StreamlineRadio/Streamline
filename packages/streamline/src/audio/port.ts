import { MessageChannelMain, BrowserWindow } from 'electron';
import type { MessagePortMain } from 'electron';
import { log } from '../logging';
import { handlePcmMessage } from './pcm-receiver';

let mainPort: MessagePortMain | null = null;
let listenerRegistered = false;

export function createAudioPort(mainWindow: BrowserWindow): void {
	if (listenerRegistered) return;
	listenerRegistered = true;

	mainWindow.webContents.on('did-finish-load', () => {
		// Close previous port so its message listener doesn't keep firing
		if (mainPort) {
			mainPort.close();
		}

		const { port1, port2 } = new MessageChannelMain();
		mainPort = port1;
		mainPort.start();
		mainPort.on('message', (event) => {
			const data = event.data;
			if (data?.buffer instanceof ArrayBuffer) {
				handlePcmMessage(data);
			}
		});

		// port2 is neutered after transfer — a new channel must be created on each reload
		mainWindow.webContents.postMessage('audio:port', null, [port2]);
		log.info('Audio MessagePort transferred to renderer');
	});
}
