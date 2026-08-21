import { Queue } from "bullmq";

import { envServer } from "@/config/env";

import { queueNames } from "./names";

const globalForQueue = globalThis as typeof globalThis & { catalogQueue?: Queue };

export function getCatalogQueue(): Queue {
  globalForQueue.catalogQueue ??= new Queue(queueNames.catalog, {
    connection: { url: envServer.redisUrl, connectTimeout: 5_000, maxRetriesPerRequest: null },
  });

  return globalForQueue.catalogQueue;
}
