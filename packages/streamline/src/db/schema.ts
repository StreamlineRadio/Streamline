import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable('songs', {
	id: text('id').primaryKey(),
	path: text('path').notNull().unique(),
	title: text('title'),
	artist: text('artist'),
	album: text('album'),
	durationSec: real('duration_sec'),
	sampleRate: integer('sample_rate'),
	channels: integer('channels'),
	bitrateKbps: integer('bitrate_kbps'),
	codec: text('codec'),
	artworkPath: text('artwork_path'),
	waveformPath: text('waveform_path'),
	fileSize: integer('file_size'),
	fileMtime: integer('file_mtime'),
	addedAt: integer('added_at').notNull(),
	lastPlayedAt: integer('last_played_at'),
	playCount: integer('play_count').notNull().default(0),
	missing: integer('missing', { mode: 'boolean' }).notNull().default(false)
});

export const libraryFolders = sqliteTable('library_folders', {
	path: text('path').primaryKey(),
	addedAt: integer('added_at').notNull()
});

export const layouts = sqliteTable('layouts', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

export const moduleInstances = sqliteTable('module_instances', {
	id: text('id').primaryKey(),
	layoutId: text('layout_id')
		.notNull()
		.references(() => layouts.id, { onDelete: 'cascade' }),
	moduleId: text('module_id').notNull(),
	title: text('title').notNull().default(''),
	x: real('x').notNull().default(100),
	y: real('y').notNull().default(100),
	width: real('width').notNull().default(400),
	height: real('height').notNull().default(300),
	zIndex: integer('z_index').notNull().default(1),
	minimized: integer('minimized', { mode: 'boolean' }).notNull().default(false),
	settingsJson: text('settings_json').notNull().default('{}')
});

export const encoderConfigs = sqliteTable('encoder_configs', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	type: text('type', { enum: ['icecast', 'shoutcast', 'file'] }).notNull(),
	format: text('format', { enum: ['mp3', 'aac', 'ogg-vorbis', 'opus', 'flac'] }).notNull(),
	bitrateKbps: integer('bitrate_kbps').notNull().default(128),
	sampleRate: integer('sample_rate').notNull().default(48000),
	channels: integer('channels').notNull().default(2),
	host: text('host'),
	port: integer('port'),
	mount: text('mount'),
	username: text('username'),
	passwordRef: text('password_ref'),
	publicListing: integer('public_listing', { mode: 'boolean' }).notNull().default(false),
	streamName: text('stream_name'),
	description: text('description'),
	genre: text('genre'),
	url: text('url'),
	pathTemplate: text('path_template'),
	rotateEveryMinutes: integer('rotate_every_minutes'),
	autoStart: integer('auto_start', { mode: 'boolean' }).notNull().default(false),
	lastStartedAt: integer('last_started_at')
});

export const queueItems = sqliteTable('queue_items', {
	id: text('id').primaryKey(),
	queueInstanceId: text('queue_instance_id').notNull(),
	songId: text('song_id')
		.notNull()
		.references(() => songs.id, { onDelete: 'cascade' }),
	position: integer('position').notNull()
});

export const hotkeys = sqliteTable('hotkeys', {
	id: text('id').primaryKey(),
	instanceId: text('instance_id').notNull(),
	action: text('action').notNull(),
	accelerator: text('accelerator').notNull()
});

export const secrets = sqliteTable('secrets', {
	ref: text('ref').primaryKey(),
	encryptedBlob: blob('encrypted_blob').notNull(),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull()
});

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});
