import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const outboxEvents = pgTable("outbox_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<{ itemId: string }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  claimedAt: timestamp("claimed_at"),
  claimedBy: text("claimed_by"),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
}, (table) => [index("outbox_events_pending_idx").on(table.createdAt)]);
