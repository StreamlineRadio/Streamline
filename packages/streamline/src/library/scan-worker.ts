import { workerData, parentPort } from 'node:worker_threads';
import { parseFile } from 'music-metadata';
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.opus']);

/* v8 ignore next 9 — runs inside a Worker thread; filesystem traversal tested by integration */
async function* walk(directory: string): AsyncGenerator<string> {
	const entries = await readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = join(directory, entry.name);
		if (entry.isDirectory()) yield* walk(fullPath);
		else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase()))
			yield fullPath;
	}
}

export function songId(filePath: string, size: number, mtime: number): string {
	return createHash('sha256').update(`${filePath}|${size}|${mtime}`).digest('hex').slice(0, 32);
}

/* v8 ignore next 44 — entire worker execution runs only in Worker thread context */
async function run() {
	const { folder } = workerData as { folder: string };
	let count = 0;

	for await (const filePath of walk(folder)) {
		try {
			const info = await stat(filePath);
			const meta = await parseFile(filePath, { skipCovers: true, duration: true });
			const id = songId(filePath, info.size, Math.floor(info.mtimeMs));

			parentPort!.postMessage({
				type: 'song',
				data: {
					id,
					path: filePath,
					title: meta.common.title ?? null,
					artist: meta.common.artist ?? null,
					album: meta.common.album ?? null,
					durationSec: meta.format.duration ?? null,
					sampleRate: meta.format.sampleRate ?? null,
					channels: meta.format.numberOfChannels ?? null,
					bitrateKbps: meta.format.bitrate ? Math.round(meta.format.bitrate / 1000) : null,
					codec: meta.format.codec ?? null,
					artworkPath: null,
					waveformPath: null,
					fileSize: info.size,
					fileMtime: Math.floor(info.mtimeMs),
					addedAt: Date.now(),
					lastPlayedAt: null,
					playCount: 0,
					missing: false
				}
			});
			count++;
			if (count % 10 === 0) {
				parentPort!.postMessage({ type: 'progress', current: count, file: filePath });
			}
		} catch (err) {
			parentPort!.postMessage({ type: 'error', file: filePath, error: String(err) });
		}
	}

	parentPort!.postMessage({ type: 'done', total: count });
}

/* v8 ignore next 3 — worker bootstrap; only runs in Worker thread context */
if (parentPort !== null) {
	run().catch((err) => parentPort!.postMessage({ type: 'fatal', error: String(err) }));
}
