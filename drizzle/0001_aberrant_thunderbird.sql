CREATE TABLE `lab_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`kind` text NOT NULL,
	`platform` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`evaluation` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lab_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`template_id` text NOT NULL,
	`baseline` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
