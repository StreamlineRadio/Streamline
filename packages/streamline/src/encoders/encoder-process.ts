import { spawn, ChildProcess } from 'child_process';
import {
	formatExtension,
	type EncoderConfig,
	type EncoderFormat,
	type EncoderStatus
} from '@streamline/shared';
import { getFFmpegPath } from './ffmpeg-path';
import { log } from '../logging';

export class EncoderProcess {
	private ffmpegProcess: ChildProcess | null = null;
	private _status: EncoderStatus = { status: 'idle' };
	private bytesEncoded = 0;
	private secondsEncoded = 0;
	private onStatusChange?: (status: EncoderStatus) => void;

	constructor(
		private readonly config: EncoderConfig,
		private readonly getPassword: () => string | null
	) {}

	get status(): EncoderStatus {
		return this._status;
	}

	setStatusListener(cb: (s: EncoderStatus) => void): void {
		this.onStatusChange = cb;
	}

	private setStatus(s: EncoderStatus): void {
		this._status = s;
		this.onStatusChange?.(s);
	}

	start(): void {
		if (this.ffmpegProcess) return;
		this.setStatus({ status: 'connecting' });

		const args = this.buildArgs();
		log.info('Starting encoder', { id: this.config.id, format: this.config.format, args });

		this.ffmpegProcess = spawn(getFFmpegPath(), args, { stdio: ['pipe', 'pipe', 'pipe'] });

		this.ffmpegProcess.stderr?.on('data', (chunk: Buffer) => {
			log.debug('ffmpeg', chunk.toString());
		});

		this.ffmpegProcess.on('error', (err) => {
			log.error('Encoder process error', err);
			this.setStatus({ status: 'error', error: err.message });
			this.ffmpegProcess = null;
		});

		this.ffmpegProcess.on('close', (code) => {
			log.info('Encoder process closed', { code, id: this.config.id });
			this.ffmpegProcess = null;
			if (this._status.status !== 'stopped') {
				this.setStatus({ status: 'error', error: `Process exited with code ${code}` });
			}
		});

		this.setStatus({
			status: 'streaming',
			bytesEncoded: 0,
			secondsEncoded: 0,
			currentBitrate: this.config.bitrateKbps
		});
	}

	write(buffer: ArrayBuffer): void {
		if (!this.ffmpegProcess?.stdin?.writable) return;
		const buf = Buffer.from(buffer);
		this.ffmpegProcess.stdin.write(buf);
		this.bytesEncoded += buf.byteLength;
		this.secondsEncoded += buf.byteLength / (this.config.sampleRate * this.config.channels * 4);
		if (this._status.status === 'streaming') {
			this.setStatus({
				status: 'streaming',
				bytesEncoded: this.bytesEncoded,
				secondsEncoded: this.secondsEncoded,
				currentBitrate: this.config.bitrateKbps
			});
		}
	}

	stop(): void {
		this.setStatus({ status: 'stopped' });
		this.ffmpegProcess?.stdin?.end();
		this.ffmpegProcess?.kill('SIGTERM');
		this.ffmpegProcess = null;
	}

	private buildArgs(): string[] {
		const base = [
			'-f',
			'f32le',
			'-ar',
			'48000',
			'-ac',
			'2',
			'-i',
			'pipe:0',
			'-ar',
			String(this.config.sampleRate),
			'-ac',
			String(this.config.channels),
			...this.formatArgs()
		];

		if (this.config.type === 'icecast' || this.config.type === 'shoutcast') {
			const pw = this.getPassword() ?? '';
			const url = `icecast://${this.config.username ?? 'source'}:${pw}@${this.config.host}:${this.config.port}${this.config.mount}`;
			return [...base, '-f', this.icecastFormat(), url];
		}

		/* v8 ignore next 7 — false branch unreachable; no EncoderConfig type exists beyond icecast/shoutcast/file */
		if (this.config.type === 'file') {
			const filePath = this.config.pathTemplate
				.replace('{date}', new Date().toISOString().slice(0, 10))
				.replace('{time}', new Date().toTimeString().slice(0, 8).replace(/:/g, '-'))
				.replace('{format}', formatExtension(this.config.format));
			return [...base, filePath];
		}

		/* v8 ignore next — unreachable: all valid EncoderConfig types handled above */
		return base;
	}

	private formatArgs(): string[] {
		const fmt = this.config.format;
		const formatMap: Record<EncoderFormat, string[]> = {
			mp3: ['-c:a', 'libmp3lame', '-b:a', `${this.config.bitrateKbps}k`],
			aac: ['-c:a', 'aac', '-b:a', `${this.config.bitrateKbps}k`],
			'ogg-vorbis': ['-c:a', 'libvorbis', '-b:a', `${this.config.bitrateKbps}k`],
			opus: ['-c:a', 'libopus', '-b:a', `${this.config.bitrateKbps}k`],
			flac: ['-c:a', 'flac']
		};
		return formatMap[fmt];
	}

	private icecastFormat(): string {
		const fmt = this.config.format;
		const formatMap: Record<EncoderFormat, string> = {
			mp3: 'mp3',
			aac: 'adts',
			'ogg-vorbis': 'ogg',
			opus: 'ogg',
			flac: 'ogg'
		};
		return formatMap[fmt];
	}
}
