import { getCatalogQueue } from "./client";
import { queueNames } from "./names";

export type FavoriteRecountJob = { itemId: string };
const retention = { age: 3_600, count: 1_000 };
const failedRetention = { age: 7 * 24 * 3_600, count: 10_000 };
const favoriteRecountCoalesceMilliseconds = 2_000;

export async function enqueueFavoriteRecount(data: FavoriteRecountJob): Promise<void> {
  const scheduledAt = (Math.floor(Date.now() / favoriteRecountCoalesceMilliseconds) + 1) * favoriteRecountCoalesceMilliseconds + 100;
  await getCatalogQueue().add(queueNames.favoritesRecount, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    delay: scheduledAt - Date.now(),
    removeOnComplete: retention,
    removeOnFail: failedRetention,
    jobId: `favorites-recount-${data.itemId}-${scheduledAt}`,
  });
}

export async function registerTrendingRebuild(): Promise<void> {
  const queue = getCatalogQueue();
  const schedulerId = "trending:rebuild:scheduled";
  const pattern = process.env.TRENDING_REBUILD_CRON ?? "*/5 * * * *";
  await queue.upsertJobScheduler(schedulerId, { pattern }, { name: queueNames.trendingRebuild, data: {} });
  const scheduler = await queue.getJobScheduler(schedulerId);
  if (!scheduler || scheduler.pattern !== pattern) throw new Error("Trending scheduler configuration mismatch");
}

export async function registerOutboxPublisher(): Promise<void> {
  const queue = getCatalogQueue();
  await queue.upsertJobScheduler("outbox:publish:scheduled", { every: 1_000 }, { name: queueNames.outboxPublish, data: {} });
  await queue.upsertJobScheduler("outbox:cleanup:scheduled", { every: 3_600_000 }, { name: queueNames.outboxCleanup, data: {} });
}

export async function enqueueCacheWarm(): Promise<void> {
  await getCatalogQueue().add(queueNames.cacheWarm, {}, { jobId: "cache:warm:catalog", removeOnComplete: retention, removeOnFail: failedRetention });
}
