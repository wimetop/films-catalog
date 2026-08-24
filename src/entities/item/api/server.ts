import "server-only";

import { eq, inArray } from "drizzle-orm";

import { envServer } from "@/config/env";
import { db } from "@/db";
import { items } from "@/db/schema";
import { readThroughCache, withRedisTimeout } from "@/server/cache/cache-aside";
import { redis } from "@/server/cache/client";
import { cacheKeys } from "@/server/cache/keys";
import { cacheStats } from "@/server/cache/stats";
import { enqueueCacheWarm } from "@/server/queue/jobs";
import { isUuid } from "@/shared/lib/is-uuid";

import type { Item } from "../model/types";
import { serializeItem } from "../model/serialize-item";
import { itemCacheSchema } from "../model/cache-schema";
export { getItems } from "./catalog-service";

const itemSelection = {
  id: items.id,
  title: items.title,
  description: items.description,
  imageUrl: items.imageUrl,
  createdAt: items.createdAt,
};

export async function getItemById(id: string): Promise<Item | null> {
  if (!isUuid(id)) return null;

  return readThroughCache({
    redis: redis as unknown as Parameters<typeof readThroughCache<Item | null>>[0]["redis"],
    key: cacheKeys.item(id),
    ttlSeconds: envServer.cacheTtlItem,
    staleTtlSeconds: 60,
    negativeTtlSeconds: 30,
    onHit: () => cacheStats.record("itemDetails", "hit"),
    onMiss: () => cacheStats.record("itemDetails", "miss"),
    parseCached: (value) => itemCacheSchema.parse(value).value,
    load: async () => {
      const [item] = await db.select(itemSelection).from(items).where(eq(items.id, id)).limit(1);
      return item ? serializeItem(item) : null;
    },
  });
}

export async function getItemsByIds(ids: string[]): Promise<Item[]> {
  const validIds = ids.filter(isUuid);
  if (validIds.length === 0) return [];

  const rows = await db
    .select(itemSelection)
    .from(items)
    .where(inArray(items.id, validIds));

  const itemsById = new Map(rows.map((item) => [item.id, serializeItem(item)]));
  return validIds.flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
}

export type CreateItemInput = {
  title: string;
  description: string | null;
  imageUrl: string | null;
};

export async function createItem(input: CreateItemInput): Promise<Item> {
  const [created] = await db.insert(items).values(input).returning(itemSelection);

  return serializeItem(created);
}

/** Marks every cached catalog response as stale after a catalog write. */
export async function revalidateCatalog(): Promise<void> {
  try {
    await withRedisTimeout(redis.incr(cacheKeys.catalogVersion()));
    await enqueueCacheWarm();
  } catch (error) {
    console.error("Catalog cache invalidation failed", { error });
  }
}
