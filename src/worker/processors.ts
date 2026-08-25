import { cleanupDeliveredOutboxEvents, getFavoriteCounts, getFavoriteCountsForItems, publishPendingOutboxEvents } from "@/entities/favorite/api/server";
import { redis } from "@/server/cache/client";
import { cacheKeys } from "@/server/cache/keys";
import { getItems } from "@/entities/item/api/catalog-service";
import { enqueueFavoriteRecount } from "@/server/queue/jobs";

export async function processFavoriteRecount(data: { itemIds: string[] }): Promise<void> {
  const itemIds = [...new Set(data.itemIds)];
  if (itemIds.length === 0) return;

  const counts = await getFavoriteCountsForItems(itemIds);
  const countsByItemId = new Set(counts.map(({ itemId }) => itemId));
  const missingItemIds = itemIds.filter((itemId) => !countsByItemId.has(itemId));
  const transaction = redis.multi();

  if (missingItemIds.length > 0) transaction.zrem(cacheKeys.trendingItems(), ...missingItemIds);
  if (counts.length > 0) transaction.zadd(cacheKeys.trendingItems(), ...counts.flatMap(({ itemId, total }) => [total, itemId]));
  transaction.del(cacheKeys.trendingTop());
  await transaction.exec();
}

export async function processTrendingRebuild(): Promise<void> {
  const lockKey = cacheKeys.lock("trending:rebuild");
  const token = crypto.randomUUID();
  const acquired = await redis.set(lockKey, token, "PX", 60_000, "NX");
  if (!acquired) return;

  let ownershipLost = false;
  const heartbeat = setInterval(() => {
    void redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) end return 0", 1, lockKey, token, "60000")
      .then((renewed) => { ownershipLost ||= Number(renewed) !== 1; })
      .catch(() => { ownershipLost = true; });
  }, 20_000);

  try {
    const counts = await getFavoriteCounts();
    if (ownershipLost) throw new Error("Trending rebuild lock ownership was lost");
    const key = cacheKeys.trendingItems();
    const transaction = redis.multi();
    transaction.del(key);
    if (counts.length > 0) transaction.zadd(key, ...counts.flatMap(({ itemId, total }) => [total, itemId]));
    transaction.del(cacheKeys.trendingTop());
    await transaction.exec();
  } finally {
    clearInterval(heartbeat);
    await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", 1, lockKey, token);
  }
}

export async function processCacheWarm(): Promise<void> {
  await getItems();
}

export async function processOutboxPublish(): Promise<void> {
  await publishPendingOutboxEvents(process.env.HOSTNAME ?? `worker:${process.pid}`, (itemIds) => enqueueFavoriteRecount({ itemIds }));
}

export async function processOutboxCleanup(): Promise<void> {
  await cleanupDeliveredOutboxEvents();
}
