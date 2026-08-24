type RedisCacheClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
  del(key: string): Promise<unknown>;
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>;
};

type ReadThroughCacheOptions<T> = {
  redis: RedisCacheClient;
  key: string;
  ttlSeconds: number;
  /** Additional period during which an expired value can be served while it refreshes in background. */
  staleTtlSeconds?: number;
  negativeTtlSeconds?: number;
  load: () => Promise<T>;
  onHit?: () => void;
  onMiss?: () => void;
  parseCached?: (value: unknown) => T;
  shouldCache?: (value: T) => boolean;
};

type CacheEnvelope<T> = { value: T; freshUntil?: number };
import { cacheMissDatabaseSemaphore } from "./database-semaphore";
import { canUseRedis, markRedisUnavailable } from "./circuit-breaker";
import { cacheKeys } from "./keys";

const lockTtlMilliseconds = 5_000;
const lockWaitAttempts = 5;
const lockWaitMilliseconds = 20;
const redisTimeoutMilliseconds = 500;
const releaseLockScript = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";
const inFlightDatabaseLoads = new Map<string, Promise<unknown>>();

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runDatabaseLoadOnce<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = inFlightDatabaseLoads.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const pending = cacheMissDatabaseSemaphore.run(load);
  inFlightDatabaseLoads.set(key, pending);
  void pending.then(
    () => {
      if (inFlightDatabaseLoads.get(key) === pending) inFlightDatabaseLoads.delete(key);
    },
    () => {
      if (inFlightDatabaseLoads.get(key) === pending) inFlightDatabaseLoads.delete(key);
    },
  );

  return pending;
}

export function withRedisTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis command timed out")), redisTimeoutMilliseconds);
    operation.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

async function writeCacheValue<T>(
  redis: RedisCacheClient,
  key: string,
  value: T,
  ttlSeconds: number,
  negativeTtlSeconds: number | undefined,
  staleTtlSeconds: number | undefined,
): Promise<void> {
  const cacheTtlSeconds = value === null && negativeTtlSeconds ? negativeTtlSeconds : ttlSeconds;
  const envelope: CacheEnvelope<T> = staleTtlSeconds && value !== null
    ? { value, freshUntil: Date.now() + cacheTtlSeconds * 1_000 }
    : { value };
  await withRedisTimeout(redis.set(key, JSON.stringify(envelope), "EX", cacheTtlSeconds + (staleTtlSeconds ?? 0)));
}

function refreshStaleValue<T>({ redis, key, ttlSeconds, negativeTtlSeconds, staleTtlSeconds, load, shouldCache }: ReadThroughCacheOptions<T>): void {
  void (async () => {
    const lockKey = cacheKeys.lock(key);
    const lockToken = crypto.randomUUID();
    const acquiredLock = await withRedisTimeout(redis.set(lockKey, lockToken, "NX", "PX", lockTtlMilliseconds)).catch(() => null);
    if (!acquiredLock) return;

    try {
      const value = await cacheMissDatabaseSemaphore.run(load);
      if (shouldCache?.(value) ?? true) await writeCacheValue(redis, key, value, ttlSeconds, negativeTtlSeconds, staleTtlSeconds);
    } catch (error) {
      console.warn("Redis stale cache refresh failed", { key, message: error instanceof Error ? error.message : String(error) });
    } finally {
      await withRedisTimeout(redis.eval(releaseLockScript, 1, lockKey, lockToken)).catch(() => undefined);
    }
  })();
}

export async function readThroughCache<T>({ redis, key, ttlSeconds, staleTtlSeconds, negativeTtlSeconds, load, onHit, onMiss, parseCached, shouldCache }: ReadThroughCacheOptions<T>): Promise<T> {
  if (!canUseRedis()) return runDatabaseLoadOnce(key, load);

  let cached: string | null;

  try {
    cached = await withRedisTimeout(redis.get(key));
  } catch (error) {
    markRedisUnavailable();
    console.warn("Redis cache fallback activated", { key, message: error instanceof Error ? error.message : String(error) });
    return runDatabaseLoadOnce(key, load);
  }

  if (cached) {
    try {
      const decoded: unknown = JSON.parse(cached);
      const value = parseCached ? parseCached(decoded) : (decoded as CacheEnvelope<T>).value;
      onHit?.();
      if (staleTtlSeconds && typeof decoded === "object" && decoded !== null && "freshUntil" in decoded && typeof decoded.freshUntil === "number" && decoded.freshUntil <= Date.now()) {
        refreshStaleValue({ redis, key, ttlSeconds, staleTtlSeconds, negativeTtlSeconds, load, shouldCache });
      }
      return value;
    } catch (error) {
      console.warn("Invalid Redis cache value removed", { key, message: error instanceof Error ? error.message : String(error) });
      await withRedisTimeout(redis.del(key)).catch(() => undefined);
    }
  }

  const lockKey = cacheKeys.lock(key);
  const lockToken = crypto.randomUUID();
  const acquiredLock = await withRedisTimeout(redis.set(lockKey, lockToken, "NX", "PX", lockTtlMilliseconds)).catch(() => null);

  if (!acquiredLock) {
    for (let attempt = 0; attempt < lockWaitAttempts; attempt += 1) {
      await sleep(lockWaitMilliseconds);
      try {
        const populated = await withRedisTimeout(redis.get(key));
        if (populated) {
          const decoded: unknown = JSON.parse(populated);
          const value = parseCached ? parseCached(decoded) : (decoded as CacheEnvelope<T>).value;
          onHit?.();
          return value;
        }
      } catch {
        return runDatabaseLoadOnce(key, load);
      }
    }

    onMiss?.();
    return runDatabaseLoadOnce(key, load);
  }

  try {
    onMiss?.();
    const value = await cacheMissDatabaseSemaphore.run(load);
    try {
      if (shouldCache?.(value) ?? true) {
        await writeCacheValue(redis, key, value, ttlSeconds, negativeTtlSeconds, staleTtlSeconds);
      }
    } catch (error) {
      console.error("Redis cache write failed", { key, message: error instanceof Error ? error.message : String(error) });
    }
    return value;
  } finally {
    await withRedisTimeout(redis.eval(releaseLockScript, 1, lockKey, lockToken)).catch(() => undefined);
  }
}
