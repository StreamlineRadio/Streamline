import { app } from 'electron';
import ffmpegStatic from 'ffmpeg-static';

let _path: string | null = null;

export function getFFmpegPath(): string {
	if (_path) return _path;
	if (app.isPackaged) {
		_path = ffmpegStatic!.replace('app.asar', 'app.asar.unpacked');
	} else {
		_path = ffmpegStatic!;
	}
	return _path!;
}
