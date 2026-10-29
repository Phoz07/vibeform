CREATE TABLE `answers` (
	`id` text PRIMARY KEY,
	`response_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text,
	CONSTRAINT `fk_answers_response_id_responses_id_fk` FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY,
	`answer_id` text NOT NULL,
	`r2_key` text NOT NULL UNIQUE,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_attachments_answer_id_answers_id_fk` FOREIGN KEY (`answer_id`) REFERENCES `answers`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY,
	`form_id` text NOT NULL,
	`submitted_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `answers_responseId_idx` ON `answers` (`response_id`);--> statement-breakpoint
CREATE INDEX `answers_fieldId_idx` ON `answers` (`field_id`);--> statement-breakpoint
CREATE INDEX `attachments_answerId_idx` ON `attachments` (`answer_id`);--> statement-breakpoint
CREATE INDEX `attachments_r2Key_idx` ON `attachments` (`r2_key`);--> statement-breakpoint
CREATE INDEX `responses_formId_idx` ON `responses` (`form_id`);--> statement-breakpoint
CREATE INDEX `responses_submittedAt_idx` ON `responses` (`submitted_at`);