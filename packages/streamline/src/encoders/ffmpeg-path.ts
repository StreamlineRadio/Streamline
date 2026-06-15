import { app } from 'electron';
import ffmpegStatic from 'ffmpeg-static';

let _path: string | null = null;

export function getFFmpegPath(): string {
	if (_path) return _path;
	/* v8 ignore next -- @preserve: ffmpeg-static is always present when installed */
	if (!ffmpegStatic) throw new Error('ffmpeg-static binary not found');
	_path = app.isPackaged ? ffmpegStatic.replace('app.asar', 'app.asar.unpacked') : ffmpegStatic;
	return _path;
}
