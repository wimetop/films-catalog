ALTER TABLE "outbox_events" ADD COLUMN "dead_lettered_at" timestamp;
--> statement-breakpoint
CREATE INDEX "outbox_events_terminal_idx" ON "outbox_events" USING btree ("delivered_at", "dead_lettered_at") WHERE "delivered_at" IS NOT NULL OR "dead_lettered_at" IS NOT NULL;
