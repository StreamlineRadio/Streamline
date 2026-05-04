PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_queue_items` (
	`id` text PRIMARY KEY NOT NULL,
	`queue_instance_id` text NOT NULL,
	`song_id` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_queue_items`("id", "queue_instance_id", "song_id", "position") SELECT "id", "queue_instance_id", "song_id", "position" FROM `queue_items`;--> statement-breakpoint
DROP TABLE `queue_items`;--> statement-breakpoint
ALTER TABLE `__new_queue_items` RENAME TO `queue_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_encoder_configs` (
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
	`public_listing` integer DEFAULT false NOT NULL,
	`stream_name` text,
	`description` text,
	`genre` text,
	`url` text,
	`path_template` text,
	`rotate_every_minutes` integer,
	`auto_start` integer DEFAULT false NOT NULL,
	`last_started_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_encoder_configs`("id", "name", "type", "format", "bitrate_kbps", "sample_rate", "channels", "host", "port", "mount", "username", "password_ref", "public_listing", "stream_name", "description", "genre", "url", "path_template", "rotate_every_minutes", "auto_start", "last_started_at") SELECT "id", "name", "type", "format", "bitrate_kbps", "sample_rate", "channels", "host", "port", "mount", "username", "password_ref", "public_listing", "stream_name", "description", "genre", "url", "path_template", "rotate_every_minutes", "auto_start", "last_started_at" FROM `encoder_configs`;--> statement-breakpoint
DROP TABLE `encoder_configs`;--> statement-breakpoint
ALTER TABLE `__new_encoder_configs` RENAME TO `encoder_configs`;