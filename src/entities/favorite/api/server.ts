import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { favorites, items, outboxEvents } from "@/db/schema";
import { serializeItem } from "@/entities/item/model/serialize-item";
import type { Item } from "@/entities/item/model/types";

const itemSelection = {
  id: items.id,
  title: items.title,
  description: items.description,
  imageUrl: items.imageUrl,
  createdAt: items.createdAt,
};

export async function getFavoriteItems(userId: string): Promise<Item[]> {
  const favoriteItems = await db
    .select(itemSelection)
    .from(favorites)
    .innerJoin(items, eq(favorites.itemId, items.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));

  return favoriteItems.map(serializeItem);
}

export async function getFavoriteItemIds(userId: string): Promise<string[]> {
  const favoriteRows = await db
    .select({ itemId: favorites.itemId })
    .from(favorites)
    .where(eq(favorites.userId, userId));

  return favoriteRows.map((favorite) => favorite.itemId);
}

export async function addFavorite(userId: string, itemId: string) {
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  if (!item) return false;

  await db.transaction(async (tx) => {
    const inserted = await tx.insert(favorites).values({ userId, itemId }).onConflictDoNothing().returning({ id: favorites.id });
    if (inserted.length > 0) await tx.insert(outboxEvents).values({ type: "favorites:recount", payload: { itemId } });
  });

  return true;
}

export async function removeFavorite(userId: string, itemId: string) {
  await db.transaction(async (tx) => {
    const deleted = await tx.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.itemId, itemId))).returning({ id: favorites.id });
    if (deleted.length > 0) await tx.insert(outboxEvents).values({ type: "favorites:recount", payload: { itemId } });
  });
}

export async function countFavoritesForItem(itemId: string): Promise<number> {
  const [result] = await db.select({ total: count() }).from(favorites).where(eq(favorites.itemId, itemId));
  return result.total;
}

export async function getFavoriteCounts(): Promise<Array<{ itemId: string; total: number }>> {
  return db.select({ itemId: favorites.itemId, total: count() }).from(favorites).groupBy(favorites.itemId);
}

export async function publishPendingOutboxEvents(workerId: string, enqueue: (itemId: string, eventId: string) => Promise<void>): Promise<void> {
  const events = await db.transaction(async (tx) => (await tx.execute(sql`
    UPDATE outbox_events SET claimed_at = now(), claimed_by = ${workerId}, attempts = attempts + 1
    WHERE id IN (SELECT id FROM outbox_events WHERE delivered_at IS NULL AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes') ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 100)
    RETURNING id, payload, attempts
  `)) as unknown as Array<{ id: string; payload: { itemId: string }; attempts: number }>);
  for (const event of events) {
    try {
      await enqueue(event.payload.itemId, event.id);
      await db.delete(outboxEvents).where(and(eq(outboxEvents.id, event.id), eq(outboxEvents.claimedBy, workerId)));
    } catch (error) {
      await db.update(outboxEvents).set({ lastError: error instanceof Error ? error.message : String(error), claimedAt: null, claimedBy: null }).where(and(eq(outboxEvents.id, event.id), eq(outboxEvents.claimedBy, workerId)));
      throw error;
    }
  }
}

export async function cleanupDeliveredOutboxEvents(): Promise<void> {
  await db.execute(sql`
    WITH stale_events AS (
      SELECT id FROM outbox_events
      WHERE delivered_at IS NOT NULL AND delivered_at < now() - interval '7 days'
      ORDER BY delivered_at
      LIMIT 1000
    )
    DELETE FROM outbox_events WHERE id IN (SELECT id FROM stale_events)
  `);
}
