import log from 'electron-log/main';
import { join } from 'path';
import { app } from 'electron';
import { readdirSync, rmSync } from 'fs';

export function initLogging(): void {
	log.transports.file.resolvePathFn = () =>
		join(app.getPath('userData'), 'logs', `streamline-${datestamp()}.log`);
	log.transports.file.maxSize = 5 * 1024 * 1024;
	log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
	log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : false;
	pruneOldLogs(14);
}

function datestamp(): string {
	return new Date().toISOString().slice(0, 10);
}

function pruneOldLogs(keep: number): void {
	const logsDir = join(app.getPath('userData'), 'logs');
	let files: string[];
	try {
		files = readdirSync(logsDir).filter((f) => f.startsWith('streamline-') && f.endsWith('.log'));
	} catch {
		return;
	}
	files.sort();
	const toDelete = files.slice(0, Math.max(0, files.length - keep));
	for (const file of toDelete) {
		try {
			rmSync(join(logsDir, file));
		} catch {
			/* ignore */
		}
	}
}

export { log };
