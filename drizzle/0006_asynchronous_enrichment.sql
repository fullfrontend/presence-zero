CREATE TABLE `scan_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`business_id` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`owner` text,
	`error` text,
	`result` text,
	FOREIGN KEY (`scan_id`) REFERENCES `scans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scan_jobs_ready` ON `scan_jobs` (`kind`,`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `scan_jobs_scan` ON `scan_jobs` (`scan_id`);