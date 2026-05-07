import { app } from 'electron';

let _path: string | null = null;

export function getFFmpegPath(): string {
	if (_path) return _path;
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const ffmpegStatic: string = require('ffmpeg-static');
	if (app.isPackaged) {
		_path = ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
	} else {
		_path = ffmpegStatic;
	}
	return _path!;
}
