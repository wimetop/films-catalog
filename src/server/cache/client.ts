import Redis from "ioredis";

import { envServer } from "@/config/env";

const globalForRedis = globalThis as typeof globalThis & { redis?: Redis };

export const redis = globalForRedis.redis ?? new Redis(envServer.redisUrl, {
  connectTimeout: 5_000,
  enableOfflineQueue: true,
  lazyConnect: true,
  maxRetriesPerRequest: 0,
  retryStrategy: () => null,
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

let lastErrorAt = 0;
redis.on("error", (error) => {
  if (Date.now() - lastErrorAt < 10_000) return;
  lastErrorAt = Date.now();
  console.error("Redis connection error", { message: error.message });
});
