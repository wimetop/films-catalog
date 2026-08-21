type RedisCacheClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>;
};

type ReadThroughCacheOptions<T> = {
  redis: RedisCacheClient;
  key: string;
  ttlSeconds: number;
  negativeTtlSeconds?: number;
  load: () => Promise<T>;
  onHit?: () => void;
  onMiss?: () => void;
  parseCached?: (value: unknown) => T;
};

type CacheEnvelope<T> = { value: T };
import { cacheMissDatabaseSemaphore } from "./database-semaphore";
import { canUseRedis, markRedisUnavailable } from "./circuit-breaker";

const lockTtlMilliseconds = 5_000;
const lockWaitAttempts = 5;
const lockWaitMilliseconds = 20;
const redisTimeoutMilliseconds = 500;
const releaseLockScript = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function withRedisTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis command timed out")), redisTimeoutMilliseconds);
    operation.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

export async function readThroughCache<T>({ redis, key, ttlSeconds, negativeTtlSeconds, load, onHit, onMiss, parseCached }: ReadThroughCacheOptions<T>): Promise<T> {
  if (!canUseRedis()) return cacheMissDatabaseSemaphore.run(load);
  try {
    const cached = await withRedisTimeout(redis.get(key));

    if (cached) {
      onHit?.();
      return parseCached ? parseCached(JSON.parse(cached)) : (JSON.parse(cached) as CacheEnvelope<T>).value;
    }
  } catch (error) {
    markRedisUnavailable();
    console.warn("Redis cache fallback activated", { key, message: error instanceof Error ? error.message : String(error) });
    return cacheMissDatabaseSemaphore.run(load);
  }

  onMiss?.();

  const lockKey = `lock:${key}`;
  const lockToken = crypto.randomUUID();
  const acquiredLock = await withRedisTimeout(redis.set(lockKey, lockToken, "NX", "PX", lockTtlMilliseconds)).catch(() => null);

  if (!acquiredLock) {
    for (let attempt = 0; attempt < lockWaitAttempts; attempt += 1) {
      await sleep(lockWaitMilliseconds);
      try {
        const populated = await withRedisTimeout(redis.get(key));
        if (populated) {
          const decoded: unknown = JSON.parse(populated);
          return parseCached ? parseCached(decoded) : (decoded as CacheEnvelope<T>).value;
        }
      } catch {
        return cacheMissDatabaseSemaphore.run(load);
      }
    }

    return cacheMissDatabaseSemaphore.run(load);
  }

  try {
    const value = await cacheMissDatabaseSemaphore.run(load);
    try {
      await withRedisTimeout(redis.set(key, JSON.stringify({ value }), "EX", value === null && negativeTtlSeconds ? negativeTtlSeconds : ttlSeconds));
    } catch (error) {
      console.error("Redis cache write failed", { key, message: error instanceof Error ? error.message : String(error) });
    }
    return value;
  } finally {
    await withRedisTimeout(redis.eval(releaseLockScript, 1, lockKey, lockToken)).catch(() => undefined);
  }
}
