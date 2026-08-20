import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("items_created_at_idx").on(table.createdAt)],
);
