ALTER TABLE "outbox_events" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "claimed_by" text;