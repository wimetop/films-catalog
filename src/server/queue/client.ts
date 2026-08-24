import { Queue } from "bullmq";

import { envServer } from "@/config/env";

import { queueNames } from "./names";

const globalForQueue = globalThis as typeof globalThis & {
  catalogQueue?: Queue;
  favoritesQueue?: Queue;
};

function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: { url: envServer.redisUrl, connectTimeout: 5_000, maxRetriesPerRequest: null },
  });
}

export function getCatalogQueue(): Queue {
  globalForQueue.catalogQueue ??= createQueue(queueNames.catalog);

  return globalForQueue.catalogQueue;
}

export function getFavoritesQueue(): Queue {
  globalForQueue.favoritesQueue ??= createQueue(queueNames.favorites);

  return globalForQueue.favoritesQueue;
}
