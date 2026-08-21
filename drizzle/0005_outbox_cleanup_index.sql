CREATE INDEX "outbox_events_delivered_idx" ON "outbox_events" USING btree ("delivered_at") WHERE "delivered_at" IS NOT NULL;
