CREATE TABLE `encoder_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`format` text NOT NULL,
	`bitrate_kbps` integer DEFAULT 128 NOT NULL,
	`sample_rate` integer DEFAULT 48000 NOT NULL,
	`channels` integer DEFAULT 2 NOT NULL,
	`host` text,
	`port` integer,
	`mount` text,
	`username` text,
	`password_ref` text,
	`public_listing` integer DEFAULT false,
	`stream_name` text,
	`description` text,
	`genre` text,
	`url` text,
	`path_template` text,
	`rotate_every_minutes` integer,
	`auto_start` integer DEFAULT false,
	`last_started_at` integer
);
--> statement-breakpoint
CREATE TABLE `hotkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`instance_id` text NOT NULL,
	`action` text NOT NULL,
	`accelerator` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `layouts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `library_folders` (
	`path` text PRIMARY KEY NOT NULL,
	`added_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `module_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`layout_id` text NOT NULL,
	`module_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`x` real DEFAULT 100 NOT NULL,
	`y` real DEFAULT 100 NOT NULL,
	`width` real DEFAULT 400 NOT NULL,
	`height` real DEFAULT 300 NOT NULL,
	`z_index` integer DEFAULT 1 NOT NULL,
	`minimized` integer DEFAULT false NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`layout_id`) REFERENCES `layouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `queue_items` (
	`id` text PRIMARY KEY NOT NULL,
	`queue_instance_id` text NOT NULL,
	`song_id` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `secrets` (
	`ref` text PRIMARY KEY NOT NULL,
	`encrypted_blob` blob NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`title` text,
	`artist` text,
	`album` text,
	`duration_sec` real,
	`sample_rate` integer,
	`channels` integer,
	`bitrate_kbps` integer,
	`codec` text,
	`artwork_path` text,
	`waveform_path` text,
	`file_size` integer,
	`file_mtime` integer,
	`added_at` integer NOT NULL,
	`last_played_at` integer,
	`play_count` integer DEFAULT 0 NOT NULL,
	`missing` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `songs_path_unique` ON `songs` (`path`);