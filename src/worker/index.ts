import { Worker } from "bullmq";

import { envServer } from "@/config/env";
import { redis } from "@/server/cache/client";
import { getCatalogQueue, getFavoritesQueue } from "@/server/queue/client";
import { queueNames } from "@/server/queue/names";
import { enqueueCacheWarm, enqueueTrendingRebuild, enqueueWorkerLiveness, registerOutboxPublisher, registerTrendingRebuild } from "@/server/queue/jobs";
import { cacheKeys } from "@/server/cache/keys";

import { processCacheWarm, processFavoriteRecount, processOutboxCleanup, processOutboxPublish, processTrendingRebuild } from "./processors";
import { createWorkerHeartbeat } from "./heartbeat";

const connection = { url: envServer.redisUrl, connectTimeout: 5_000, maxRetriesPerRequest: null };
const heartbeat = createWorkerHeartbeat(redis, cacheKeys.workerHeartbeat());

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
    case queueNames.workerLiveness:
      break;
    default:
      throw new Error(`Unsupported catalog job: ${job.name}`);
  }
  console.info("Worker job completed", { id: job.id, name: job.name, durationMs: Date.now() - startedAt });
  await heartbeat.afterJob();
}, { connection, concurrency: 1, limiter: { max: 20, duration: 1_000 } });

const favoritesWorker = new Worker(queueNames.favorites, async (job) => {
  if (job.name !== queueNames.favoritesRecount) throw new Error(`Unsupported favorites job: ${job.name}`);

  const startedAt = Date.now();
  await processFavoriteRecount(job.data);
  console.info("Worker job completed", { id: job.id, name: job.name, durationMs: Date.now() - startedAt });
  await heartbeat.afterJob();
}, { connection, concurrency: 1, limiter: { max: 10, duration: 1_000 } });

for (const worker of [catalogWorker, favoritesWorker]) {
  worker.on("failed", (job, error) => {
    console.error("Worker job failed", {
      id: job?.id,
      name: job?.name,
      attemptsMade: job?.attemptsMade,
      message: error.message,
    });
  });
  worker.on("error", (error) => fatal("Worker connection failed", error));
}

let terminating = false;
function fatal(message: string, error: unknown) {
  if (terminating) return;
  terminating = true;
  console.error(message, { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
}

redis.on("end", () => fatal("Worker Redis connection ended", new Error("Redis connection ended")));

async function bootstrap() {
  if (redis.status === "wait") await redis.connect();
  await registerTrendingRebuild();
  await registerOutboxPublisher();
  await Promise.all([catalogWorker.waitUntilReady(), favoritesWorker.waitUntilReady()]);
  heartbeat.start(enqueueWorkerLiveness, () => fatal("Worker liveness probe was not processed", new Error("Heartbeat expired")));
  await enqueueWorkerLiveness();
  await enqueueCacheWarm();
  await enqueueTrendingRebuild();
  console.info("Worker ready", { queues: [queueNames.catalog, queueNames.favorites] });
}

void bootstrap().catch((error) => {
  console.error("Worker bootstrap failed", { error });
  process.exit(1);
});

async function shutdown(signal: string) {
  console.info("Worker shutting down", { signal });
  terminating = true;
  await Promise.all([catalogWorker.close(), favoritesWorker.close()]);
  heartbeat.stop();
  await Promise.all([getCatalogQueue().close(), getFavoritesQueue().close()]);
  await redis.quit();
  console.info("worker.shutdown.completed", { signal });
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
