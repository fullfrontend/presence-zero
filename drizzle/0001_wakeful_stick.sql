ALTER TABLE `scans` ADD `pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `scans` ADD `archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `scans` ADD `label` text;--> statement-breakpoint
ALTER TABLE `scans` ADD `title` text;