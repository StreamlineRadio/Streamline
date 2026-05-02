export type EncoderFormat = 'mp3' | 'aac' | 'ogg-vorbis' | 'opus' | 'flac'
export type EncoderType = 'icecast' | 'shoutcast' | 'file'
export type EncoderSampleRate = 22050 | 32000 | 44100 | 48000
export type EncoderStatus =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'streaming'; bytesEncoded: number; secondsEncoded: number; currentBitrate: number; listeners?: number }
  | { status: 'error'; error: string }
  | { status: 'stopped' }

export interface EncoderConfig {
  id: string
  name: string
  type: EncoderType
  format: EncoderFormat
  bitrateKbps: number
  sampleRate: EncoderSampleRate
  channels: 1 | 2
  host?: string
  port?: number
  mount?: string
  username?: string
  passwordRef?: string
  publicListing?: boolean
  streamName?: string
  description?: string
  genre?: string
  url?: string
  pathTemplate?: string
  rotateEveryMinutes?: number
  autoStart?: boolean
}
