export interface Song {
	id: string;
	path: string;
	title: string | null;
	artist: string | null;
	album: string | null;
	durationSec: number | null;
	sampleRate: number | null;
	channels: number | null;
	bitrateKbps: number | null;
	codec: string | null;
	artworkPath: string | null;
	waveformPath: string | null;
	fileSize: number | null;
	fileMtime: number | null;
	addedAt: number;
	lastPlayedAt: number | null;
	playCount: number;
	missing: boolean;
}
