import type { EncoderConfig, EncoderStatus } from '@streamline/shared';
import { IPC } from '@streamline/shared';
import { BrowserWindow } from 'electron';
import { EncoderProcess } from './encoder-process';
import { getSecret } from '../ipc/handlers/secret';
import { registerEncoderConsumer, unregisterEncoderConsumer } from '../audio/pcm-receiver';
import { log } from '../logging';

const processes = new Map<string, EncoderProcess>();

export function startEncoder(config: EncoderConfig, win: BrowserWindow): string {
	if (processes.has(config.id)) stopEncoder(config.id);

	const proc = new EncoderProcess(config, () =>
		'passwordRef' in config && config.passwordRef ? getSecret(config.passwordRef) : null
	);

	proc.setStatusListener((status) => {
		win.webContents.send(IPC.ENCODER_STATUS_PUSH, config.id, status);
	});

	processes.set(config.id, proc);
	registerEncoderConsumer(config.id, (buf) => proc.write(buf));
	proc.start();
	log.info('Encoder started', { id: config.id, name: config.name });
	return config.id;
}

export function stopEncoder(id: string): void {
	const proc = processes.get(id);
	if (!proc) return;
	unregisterEncoderConsumer(id);
	proc.stop();
	processes.delete(id);
	log.info('Encoder stopped', { id });
}

export function getEncoderStatus(id: string): EncoderStatus {
	return processes.get(id)?.status ?? { status: 'idle' };
}
