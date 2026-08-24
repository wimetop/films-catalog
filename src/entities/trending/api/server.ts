import "server-only";

import { envServer } from "@/config/env";
import { getItemsByIds } from "@/entities/item/api/server";
import { redis } from "@/server/cache/client";
import { readThroughCache, withRedisTimeout } from "@/server/cache/cache-aside";
import { cacheKeys } from "@/server/cache/keys";

export async function getTrendingItems() {
  return readThroughCache({
    redis: redis as unknown as Parameters<typeof readThroughCache>[0]["redis"],
    key: cacheKeys.trendingTop(),
    ttlSeconds: 120,
    shouldCache : (items) => items.length > 0,
    load: async () => {
      try {
        const ids = await withRedisTimeout(redis.zrevrange(cacheKeys.trendingItems(), 0, envServer.trendingTopN - 1));
        return getItemsByIds(ids);
      } catch (error) {
        console.warn("Trending fallback activated", { message: error instanceof Error ? error.message : String(error) });
        return [];
      }
    },
  });
}
