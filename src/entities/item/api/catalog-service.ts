import { desc } from "drizzle-orm";

import { envServer } from "@/config/env";
import { db } from "@/db";
import { items } from "@/db/schema";
import { readThroughCache, withRedisTimeout } from "@/server/cache/cache-aside";
import { canUseRedis, markRedisUnavailable } from "@/server/cache/circuit-breaker";
import { cacheMissDatabaseSemaphore } from "@/server/cache/database-semaphore";
import { redis } from "@/server/cache/client";
import { cacheKeys } from "@/server/cache/keys";
import { cacheStats } from "@/server/cache/stats";

import { itemListCacheSchema } from "../model/cache-schema";
import { serializeItem } from "../model/serialize-item";
import type { Item } from "../model/types";

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
  if (!canUseRedis()) return cacheMissDatabaseSemaphore.run(() => readItems(page, pageSize));

  let version: string | null;

  try {
    version = await withRedisTimeout(redis.get(cacheKeys.catalogVersion()));
  } catch (error) {
    markRedisUnavailable();
    console.warn("Catalog cache version read failed; bypassing Redis cache", {
      message: error instanceof Error ? error.message : String(error),
    });
    return cacheMissDatabaseSemaphore.run(() => readItems(page, pageSize));
  }

  const cachePage = page ?? 0;
  const cachePageSize = pageSize ?? 0;
  return readThroughCache({
    redis: redis as unknown as Parameters<typeof readThroughCache<Item[]>>[0]["redis"],
    key: cacheKeys.itemsList(cachePage, cachePageSize, version ?? "0"),
    ttlSeconds: envServer.cacheTtlList,
    staleTtlSeconds: 30,
    onHit: () => cacheStats.record("itemsList", "hit"),
    onMiss: () => cacheStats.record("itemsList", "miss"),
    parseCached: (value) => itemListCacheSchema.parse(value).value,
    load: () => readItems(page, pageSize),
  });
}
