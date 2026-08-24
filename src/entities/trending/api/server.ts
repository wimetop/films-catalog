import "server-only";

import { envServer } from "@/config/env";
import { getTrendingItemIds } from "@/entities/favorite/api/server";
import { getItemsByIds } from "@/entities/item/api/server";
import { itemListCacheSchema } from "@/entities/item/model/cache-schema";
import { redis } from "@/server/cache/client";
import { readThroughCache, withRedisTimeout } from "@/server/cache/cache-aside";
import { canUseRedis, markRedisUnavailable } from "@/server/cache/circuit-breaker";
import { cacheKeys } from "@/server/cache/keys";

async function loadTrendingFromDatabase() {
  const ids = await getTrendingItemIds(envServer.trendingTopN);
  return getItemsByIds(ids);
}

export async function getTrendingItems() {
  return readThroughCache({
    redis: redis as unknown as Parameters<typeof readThroughCache>[0]["redis"],
    key: cacheKeys.trendingTop(),
    ttlSeconds: 120,
    staleTtlSeconds: 30,
    parseCached: (value) => itemListCacheSchema.parse(value).value,
    shouldCache: (items) => items.length > 0,
    load: async () => {
      if (!canUseRedis()) return loadTrendingFromDatabase();

      try {
        const ids = await withRedisTimeout(redis.zrevrange(cacheKeys.trendingItems(), 0, envServer.trendingTopN - 1));
        return getItemsByIds(ids);
      } catch (error) {
        markRedisUnavailable();
        console.warn("Trending database fallback activated", { message: error instanceof Error ? error.message : String(error) });
        return loadTrendingFromDatabase();
      }
    },
  });
}
