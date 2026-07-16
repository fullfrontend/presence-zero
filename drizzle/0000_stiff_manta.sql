CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`category` text,
	`rating` real,
	`review_count` integer,
	`listed_website` text,
	`presence_status` text,
	`retried` integer DEFAULT false NOT NULL,
	`score` integer,
	`lead_status` text DEFAULT 'new' NOT NULL,
	`note` text,
	`status_updated_at` integer,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `domain_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`domain` text NOT NULL,
	`available` integer,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rdap_cache` (
	`domain` text PRIMARY KEY NOT NULL,
	`available` integer NOT NULL,
	`checked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`location` text NOT NULL,
	`category` text NOT NULL,
	`country_code` text DEFAULT 'us' NOT NULL,
	`provider` text NOT NULL,
	`provider_config` text,
	`status` text DEFAULT 'running' NOT NULL,
	`phase` text DEFAULT 'fetch' NOT NULL,
	`provider_cursor` text,
	`error_message` text,
	`total_found` integer DEFAULT 0 NOT NULL,
	`total_processed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
