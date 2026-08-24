import { envServer } from "@/config/env";

import { getCatalogQueue, getFavoritesQueue } from "./client";
import { queueNames } from "./names";

export type FavoriteRecountJob = { itemIds: string[] };
const retention = { age: 3_600, count: 1_000 };
const failedRetention = { age: 7 * 24 * 3_600, count: 10_000 };

export async function enqueueFavoriteRecount(data: FavoriteRecountJob): Promise<void> {
  const itemIds = [...new Set(data.itemIds)];
  if (itemIds.length === 0) return;

  await getFavoritesQueue().add(queueNames.favoritesRecount, { itemIds }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: retention,
    removeOnFail: failedRetention,
  });
}

export async function registerTrendingRebuild(): Promise<void> {
  const queue = getCatalogQueue();
  const schedulerId = "trending:rebuild:scheduled";
  const pattern = envServer.trendingRebuildCron;
  await queue.upsertJobScheduler(schedulerId, { pattern }, {
    name: queueNames.trendingRebuild,
    data: {},
    opts: { removeOnComplete: retention, removeOnFail: failedRetention },
  });
  const scheduler = await queue.getJobScheduler(schedulerId);
  if (!scheduler || scheduler.pattern !== pattern) throw new Error("Trending scheduler configuration mismatch");
}

export async function registerOutboxPublisher(): Promise<void> {
  const queue = getCatalogQueue();
  await queue.upsertJobScheduler("outbox:publish:scheduled", { every: 1_000 }, {
    name: queueNames.outboxPublish,
    data: {},
    opts: { removeOnComplete: retention, removeOnFail: failedRetention },
  });
  await queue.upsertJobScheduler("outbox:cleanup:scheduled", { every: 3_600_000 }, {
    name: queueNames.outboxCleanup,
    data: {},
    opts: { removeOnComplete: retention, removeOnFail: failedRetention },
  });
}

export async function enqueueCacheWarm(): Promise<void> {
  await getCatalogQueue().add(queueNames.cacheWarm, {}, {
    removeOnComplete: retention,
    removeOnFail: failedRetention,
  });
}
