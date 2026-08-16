ALTER TABLE `files` ADD `commit_count` integer;
--> statement-breakpoint
ALTER TABLE `files` ADD `author_count` integer;
--> statement-breakpoint
ALTER TABLE `files` ADD `recent_modifications` integer;
--> statement-breakpoint
ALTER TABLE `files` ADD `last_modified` integer;
--> statement-breakpoint
ALTER TABLE `files` ADD `churn` text;