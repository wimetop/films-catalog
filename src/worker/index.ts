import { Worker } from "bullmq";

import { envServer } from "@/config/env";
import { redis } from "@/server/cache/client";
import { getCatalogQueue, getFavoritesQueue } from "@/server/queue/client";
import { queueNames } from "@/server/queue/names";
import { registerOutboxPublisher, registerTrendingRebuild } from "@/server/queue/jobs";

import { processCacheWarm, processFavoriteRecount, processOutboxCleanup, processOutboxPublish, processTrendingRebuild } from "./processors";

const connection = { url: envServer.redisUrl, connectTimeout: 5_000, maxRetriesPerRequest: null };

const catalogWorker = new Worker(queueNames.catalog, async (job) => {
  const startedAt = Date.now();
  switch (job.name) {
    // Compatibility path for jobs that were waiting in the old single queue
    // during deployment. New jobs are always written to the favorites queue.
    case queueNames.favoritesRecount: {
      const data = job.data as { itemId?: unknown };
      if (typeof data.itemId !== "string") throw new Error("Invalid legacy favorites recount payload");
      await processFavoriteRecount({ itemIds: [data.itemId] });
      break;
    }
    case queueNames.trendingRebuild:
      await processTrendingRebuild();
      break;
    case queueNames.cacheWarm:
      await processCacheWarm();
      break;
    case queueNames.outboxPublish:
      await processOutboxPublish();
      break;
    case queueNames.outboxCleanup:
      await processOutboxCleanup();
      break;
    default:
      throw new Error(`Unsupported catalog job: ${job.name}`);
  }
  console.info("Worker job completed", { id: job.id, name: job.name, durationMs: Date.now() - startedAt });
}, { connection, concurrency: 1, limiter: { max: 20, duration: 1_000 } });

const favoritesWorker = new Worker(queueNames.favorites, async (job) => {
  if (job.name !== queueNames.favoritesRecount) throw new Error(`Unsupported favorites job: ${job.name}`);

  const startedAt = Date.now();
  await processFavoriteRecount(job.data);
  console.info("Worker job completed", { id: job.id, name: job.name, durationMs: Date.now() - startedAt });
}, { connection, concurrency: 2, limiter: { max: 10, duration: 1_000 } });

for (const worker of [catalogWorker, favoritesWorker]) {
  worker.on("failed", (job, error) => {
    console.error("Worker job failed", {
      id: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      message: error.message,
    });
  });
}

async function bootstrap() {
  if (redis.status === "wait") await redis.connect();
  await registerTrendingRebuild();
  await registerOutboxPublisher();
  await Promise.all([catalogWorker.waitUntilReady(), favoritesWorker.waitUntilReady()]);
  console.info("Worker ready", { queues: [queueNames.catalog, queueNames.favorites] });
}

void bootstrap().catch((error) => {
  console.error("Worker bootstrap failed", { error });
  process.exit(1);
});

async function shutdown(signal: string) {
  console.info("Worker shutting down", { signal });
  await Promise.all([catalogWorker.close(), favoritesWorker.close()]);
  await Promise.all([getCatalogQueue().close(), getFavoritesQueue().close()]);
  await redis.quit();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
