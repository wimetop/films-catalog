ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "outbox_events" FROM anon, authenticated;
--> statement-breakpoint
DROP INDEX "outbox_events_pending_idx";
--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("created_at") WHERE "delivered_at" IS NULL;
