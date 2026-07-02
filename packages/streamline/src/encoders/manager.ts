import type { EncoderConfig, EncoderStatus } from '@streamline/shared';
import { IPC } from '@streamline/shared';
import { BrowserWindow } from 'electron';
import { EncoderProcess } from './encoder-process';
import { getSecret } from '../ipc/handlers/secret';
import { registerEncoderConsumer, unregisterEncoderConsumer } from '../audio/pcm-receiver';
import { log } from '../logging';

const processes = new Map<string, EncoderProcess>();

export function startEncoder(config: EncoderConfig, mainWindow: BrowserWindow): string {
	if (processes.has(config.id)) stopEncoder(config.id);

	const encoderProcess = new EncoderProcess(config, () =>
		/* v8 ignore next -- @preserve: getSecret path untestable without safeStorage (Electron-only) */
		'passwordRef' in config && config.passwordRef ? getSecret(config.passwordRef) : null
	);

	encoderProcess.setStatusListener((status) => {
		mainWindow.webContents.send(IPC.ENCODER_STATUS_PUSH, config.id, status);
	});

	processes.set(config.id, encoderProcess);
	registerEncoderConsumer(config.id, (buf) => encoderProcess.write(buf));
	encoderProcess.start();
	log.info('Encoder started', { id: config.id, name: config.name });
	return config.id;
}

export function stopEncoder(id: string): void {
	const encoderProcess = processes.get(id);
	if (!encoderProcess) return;
	unregisterEncoderConsumer(id);
	encoderProcess.stop();
	processes.delete(id);
	log.info('Encoder stopped', { id });
}

export function getEncoderStatus(id: string): EncoderStatus {
	return processes.get(id)?.status ?? { status: 'idle' };
}

export function isAnyEncoderStreaming(): boolean {
	for (const encoderProcess of processes.values()) {
		const { status } = encoderProcess.status;
		if (status === 'streaming' || status === 'connecting' || status === 'reconnecting') return true;
	}
	return false;
}
