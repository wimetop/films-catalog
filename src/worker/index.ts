import { Worker } from "bullmq";

import { envServer } from "@/config/env";
import { redis } from "@/server/cache/client";
import { getCatalogQueue } from "@/server/queue/client";
import { queueNames } from "@/server/queue/names";
import { registerOutboxPublisher, registerTrendingRebuild } from "@/server/queue/jobs";

import { processCacheWarm, processFavoriteRecount, processOutboxCleanup, processOutboxPublish, processTrendingRebuild } from "./processors";

const worker = new Worker(queueNames.catalog, async (job) => {
  const startedAt = Date.now();
  if (job.name === queueNames.favoritesRecount) await processFavoriteRecount(job.data);
  if (job.name === queueNames.trendingRebuild) await processTrendingRebuild();
  if (job.name === queueNames.cacheWarm) await processCacheWarm();
  if (job.name === queueNames.outboxPublish) await processOutboxPublish();
  if (job.name === queueNames.outboxCleanup) await processOutboxCleanup();
  console.info("Worker job completed", { id: job.id, name: job.name, durationMs: Date.now() - startedAt });
}, { connection: { url: envServer.redisUrl, connectTimeout: 5_000, maxRetriesPerRequest: null }, concurrency: 1, limiter: { max: 20, duration: 1_000 } });

worker.on("failed", (job, error) => {
  console.error("Worker job failed", {
    id: job?.id,
    name: job?.name,
    attemptsMade: job?.attemptsMade,
    message: error.message,
  });
});

async function bootstrap() {
  if (redis.status === "wait") await redis.connect();
  await registerTrendingRebuild();
  await registerOutboxPublisher();
  await worker.waitUntilReady();
  console.info("Worker ready", { queue: queueNames.catalog });
}

void bootstrap().catch((error) => {
  console.error("Worker bootstrap failed", { error });
  process.exit(1);
});

async function shutdown(signal: string) {
  console.info("Worker shutting down", { signal });
  await worker.close();
  await getCatalogQueue().close();
  await redis.quit();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
