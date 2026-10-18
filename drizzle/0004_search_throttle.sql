CREATE TABLE `search_throttle` (
	`key` text PRIMARY KEY NOT NULL,
	`next_allowed_at` integer DEFAULT 0 NOT NULL,
	`blocked_until` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`owner` text
);
