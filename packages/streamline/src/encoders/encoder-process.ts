import { spawn, ChildProcess } from 'child_process';
import {
	formatExtension,
	type EncoderConfig,
	type EncoderFormat,
	type EncoderStatus
} from '@streamline/shared';
import { getFFmpegPath } from './ffmpeg-path';
import { ExponentialBackoff } from './reconnect';
import { log } from '../logging';

// ponytail: streaming this long counts as a healthy connection, so backoff restarts from zero
const STABLE_CONNECTION_MS = 30000;
// give up reconnecting when the encoder has never streamed once (wrong password, bad mount)
const MAX_ATTEMPTS_BEFORE_FIRST_CONNECT = 5;

export class EncoderProcess {
	private ffmpegProcess: ChildProcess | null = null;
	private _status: EncoderStatus = { status: 'idle' };
	private bytesEncoded = 0;
	private secondsEncoded = 0;
	private onStatusChange?: (status: EncoderStatus) => void;
	private readonly backoff = new ExponentialBackoff();
	private reconnectTimer: NodeJS.Timeout | null = null;
	private streamingSince = 0;
	private hasEverStreamed = false;

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
		if (this._status.status !== 'reconnecting') this.setStatus({ status: 'connecting' });

		const args = this.buildArgs();
		log.info('Starting encoder', { id: this.config.id, format: this.config.format, args });

		const spawned = spawn(getFFmpegPath(), args, { stdio: ['pipe', 'pipe', 'pipe'] });
		this.ffmpegProcess = spawned;

		spawned.stderr?.on('data', (chunk: Buffer) => {
			const stderrText = chunk.toString();
			log.debug('ffmpeg', stderrText);
			// ponytail: ffmpeg only prints progress stats (`time=...`) once the output is open,
			// so the first stats line is the cheapest reliable "connection established" signal
			if (
				this.ffmpegProcess === spawned &&
				this._status.status !== 'streaming' &&
				/\btime=\d/.test(stderrText)
			) {
				this.streamingSince = Date.now();
				this.hasEverStreamed = true;
				this.setStatus({
					status: 'streaming',
					bytesEncoded: this.bytesEncoded,
					secondsEncoded: this.secondsEncoded,
					currentBitrate: this.config.bitrateKbps
				});
			}
		});

		spawned.on('error', (err) => {
			log.error('Encoder process error', err);
			if (this.ffmpegProcess !== spawned) return;
			this.ffmpegProcess = null;
			this.handleUnexpectedExit(err.message);
		});

		spawned.on('close', (code) => {
			log.info('Encoder process closed', { code, id: this.config.id });
			if (this.ffmpegProcess !== spawned) return;
			this.ffmpegProcess = null;
			if (this._status.status !== 'stopped') {
				this.handleUnexpectedExit(`Process exited with code ${code}`);
			}
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
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.setStatus({ status: 'stopped' });
		this.ffmpegProcess?.stdin?.end();
		this.ffmpegProcess?.kill('SIGTERM');
		this.ffmpegProcess = null;
	}

	private handleUnexpectedExit(error: string): void {
		if (this.reconnectTimer || this._status.status === 'stopped') return;
		const streamedMs = this.streamingSince > 0 ? Date.now() - this.streamingSince : 0;
		this.streamingSince = 0;
		if (this.config.type === 'file') {
			this.setStatus({ status: 'error', error });
			return;
		}
		if (streamedMs >= STABLE_CONNECTION_MS) this.backoff.reset();
		if (!this.hasEverStreamed && this.backoff.attempts >= MAX_ATTEMPTS_BEFORE_FIRST_CONNECT) {
			this.setStatus({
				status: 'error',
				error: `Could not connect after ${this.backoff.attempts} attempts: ${error}`
			});
			return;
		}
		const delayMs = this.backoff.next();
		this.setStatus({ status: 'reconnecting', attempt: this.backoff.attempts, delayMs });
		log.warn('Encoder connection lost, reconnecting', {
			id: this.config.id,
			attempt: this.backoff.attempts,
			delayMs,
			error
		});
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.start();
		}, delayMs);
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

		/* v8 ignore next -- @preserve: no EncoderConfig type exists beyond icecast/shoutcast/file */
		if (this.config.type === 'file') {
			const filePath = this.config.pathTemplate
				.replace('{date}', new Date().toISOString().slice(0, 10))
				.replace('{time}', new Date().toTimeString().slice(0, 8).replace(/:/g, '-'))
				.replace('{format}', formatExtension(this.config.format));
			return [...base, filePath];
		}

		/* v8 ignore next -- @preserve: unreachable, all valid EncoderConfig types handled above */
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
