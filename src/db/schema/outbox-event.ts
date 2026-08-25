import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const outboxEvents = pgTable("outbox_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<{ itemId: string }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  deadLetteredAt: timestamp("dead_lettered_at"),
  claimedAt: timestamp("claimed_at"),
  claimedBy: text("claimed_by"),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
}, (table) => [
  index("outbox_events_pending_idx").on(table.createdAt).where(sql`${table.deliveredAt} is null`),
  index("outbox_events_terminal_idx").on(table.deliveredAt, table.deadLetteredAt).where(sql`${table.deliveredAt} is not null or ${table.deadLetteredAt} is not null`),
]);
