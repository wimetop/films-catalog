import { desc, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/db";
import { items } from "@/db/schema";
import { envServer } from "@/config/env";
import { readThroughCache, withRedisTimeout } from "@/server/cache/cache-aside";
import { redis } from "@/server/cache/client";
import { cacheKeys } from "@/server/cache/keys";
import { cacheStats } from "@/server/cache/stats";
import { enqueueCacheWarm } from "@/server/queue/jobs";
import { isUuid } from "@/shared/lib/is-uuid";

import type { Item } from "../model/types";
import { serializeItem } from "../model/serialize-item";
import { catalogCacheConfig } from "../model/cache-config";
import { itemCacheSchema, itemListCacheSchema } from "../model/cache-schema";

const itemSelection = {
  id: items.id,
  title: items.title,
  description: items.description,
  imageUrl: items.imageUrl,
  createdAt: items.createdAt,
};

async function readItems(page?: number, pageSize?: number): Promise<Item[]> {
  let query = db.select(itemSelection).from(items).orderBy(desc(items.createdAt)).$dynamic();
  if (page !== undefined && pageSize !== undefined) query = query.limit(pageSize).offset((page - 1) * pageSize);
  const itemList = await query;

  return itemList.map(serializeItem);
}

export async function getItems(page?: number, pageSize?: number): Promise<Item[]> {
  const version = await withRedisTimeout(redis.get(cacheKeys.catalogVersion())).catch(() => "0") ?? "0";
  const cachePage = page ?? 0;
  const cachePageSize = pageSize ?? 0;
  return readThroughCache({
    redis: redis as unknown as Parameters<typeof readThroughCache<Item[]>>[0]["redis"],
    key: cacheKeys.itemsList(cachePage, cachePageSize, version),
    ttlSeconds: envServer.cacheTtlList,
    onHit: () => cacheStats.record("itemsList", "hit"),
    onMiss: () => cacheStats.record("itemsList", "miss"),
    parseCached: (value) => itemListCacheSchema.parse(value).value,
    load: () => readItems(page, pageSize),
  });
}

export async function getItemById(id: string): Promise<Item | null> {
  if (!isUuid(id)) return null;

  return readThroughCache({
    redis: redis as unknown as Parameters<typeof readThroughCache<Item | null>>[0]["redis"],
    key: cacheKeys.item(id),
    ttlSeconds: envServer.cacheTtlItem,
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
  for (const tag of catalogCacheConfig.tags) {
    revalidateTag(tag, "max");
  }

  try {
    await withRedisTimeout(redis.incr(cacheKeys.catalogVersion()));
    await enqueueCacheWarm();
  } catch (error) {
    console.error("Catalog cache invalidation failed", { error });
  }
}
