import { beforeEach, describe, expect, it, vi } from "vitest";

import { readThroughCache } from "./cache-aside";
import { resetRedisCircuitForTests } from "./circuit-breaker";

function createRedis(values = new Map<string, string>()) {
  return {
    eval: vi.fn(async (_script: string, _keys: number, key: string, token: string) =>
      values.get(key) === token ? Number(values.delete(key)) : 0,
    ),
    del: vi.fn(async (key: string) => Number(values.delete(key))),
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, ...args: unknown[]) => {
      if (args.includes("NX") && values.has(key)) return null;
      values.set(key, value);
      return "OK";
    }),
  };
}

describe("readThroughCache", () => {
  beforeEach(() => resetRedisCircuitForTests());
  it("returns a cached DTO without calling the database loader", async () => {
    const redis = createRedis(new Map([["item:1", JSON.stringify({ value: { id: "1" } })]]));
    const load = vi.fn();

    await expect(readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load })).resolves.toEqual({ id: "1" });
    expect(load).not.toHaveBeenCalled();
  });

  it("falls back to the loader when cached JSON fails runtime validation", async () => {
    const redis = createRedis(new Map([["item:1", JSON.stringify({ value: { id: "not-a-uuid" } })]]));
    const load = vi.fn(async () => ({ id: "1" }));

    await expect(readThroughCache({
      redis,
      key: "item:1",
      ttlSeconds: 60,
      load,
      parseCached: (value) => {
        if (typeof value !== "object" || value === null) throw new Error("Invalid cache envelope");
        const item = (value as { value?: { id?: unknown } }).value;
        if (item?.id !== "expected-id") throw new Error("Invalid cached item");
        return item as { id: string };
      },
    })).resolves.toEqual({ id: "1" });
    expect(load).toHaveBeenCalledOnce();
    expect(redis.del).toHaveBeenCalledWith("item:1");
  });

  it("loads and stores a DTO after a cache miss", async () => {
    const redis = createRedis();
    const load = vi.fn(async () => ({ id: "1" }));

    await expect(readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load })).resolves.toEqual({ id: "1" });
    expect(load).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenCalledWith("item:1", JSON.stringify({ value: { id: "1" } }), "EX", 60);
  });

  it("uses the value stored by a previous request as a cache hit", async () => {
    const redis = createRedis();
    const load = vi.fn(async () => ({ id: "1" }));

    await readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load });
    await readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load });

    expect(load).toHaveBeenCalledOnce();
  });

  it("returns a stale value immediately and refreshes it once in the background", async () => {
    const redis = createRedis(new Map([[
      "item:stale",
      JSON.stringify({ value: { id: "old" }, freshUntil: Date.now() - 1 }),
    ]]));
    const load = vi.fn(async () => ({ id: "new" }));

    await expect(readThroughCache({
      redis,
      key: "item:stale",
      ttlSeconds: 60,
      staleTtlSeconds: 30,
      load,
    })).resolves.toEqual({ id: "old" });

    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    expect(redis.set).toHaveBeenCalledWith(
      "item:stale",
      expect.stringContaining('"id":"new"'),
      "EX",
      90,
    );
  });

  it("falls back to the loader when Redis is unavailable", async () => {
    const redis = createRedis();
    redis.get.mockRejectedValueOnce(new Error("Redis offline"));
    const load = vi.fn(async () => ({ id: "1" }));

    await expect(readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load })).resolves.toEqual({ id: "1" });
  });

  it("keeps Redis-outage fallbacks within the database concurrency limit", async () => {
    const redis = createRedis();
    redis.get.mockRejectedValue(new Error("Redis offline"));
    let active = 0;
    let peak = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const load = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await gate;
      active -= 1;
      return { id: "1" };
    });

    const requests = Array.from({ length: 26 }, (_, index) => readThroughCache({ redis, key: `item:${index}`, ttlSeconds: 60, load }));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(25));
    expect(peak).toBe(25);
    release?.();
    await expect(Promise.all(requests)).resolves.toHaveLength(26);
  });

  it("coalesces concurrent same-key fallbacks while Redis is unavailable", async () => {
    const redis = createRedis();
    redis.get.mockRejectedValue(new Error("Redis offline"));
    let resolveLoad: ((value: { id: string }) => void) | undefined;
    const load = vi.fn(() => new Promise<{ id: string }>((resolve) => { resolveLoad = resolve; }));

    const first = readThroughCache({ redis, key: "item:redis-down", ttlSeconds: 60, load });
    const second = readThroughCache({ redis, key: "item:redis-down", ttlSeconds: 60, load });
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    resolveLoad?.({ id: "1" });

    await expect(Promise.all([first, second])).resolves.toEqual([{ id: "1" }, { id: "1" }]);
  });

  it("uses one loader for concurrent misses of the same key", async () => {
    const redis = createRedis();
    let resolveLoad: ((value: { id: string }) => void) | undefined;
    const load = vi.fn(() => new Promise<{ id: string }>((resolve) => { resolveLoad = resolve; }));

    const first = readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load });
    const second = readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load });
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    resolveLoad?.({ id: "1" });

    await expect(Promise.all([first, second])).resolves.toEqual([{ id: "1" }, { id: "1" }]);
  });

  it("records a single-flight waiter as a cache hit after it observes the populated value", async () => {
    const redis = createRedis();
    let resolveLoad: ((value: { id: string }) => void) | undefined;
    const load = vi.fn(() => new Promise<{ id: string }>((resolve) => { resolveLoad = resolve; }));
    const onHit = vi.fn();
    const onMiss = vi.fn();

    const first = readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load, onHit, onMiss });
    const second = readThroughCache({ redis, key: "item:1", ttlSeconds: 60, load, onHit, onMiss });
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    resolveLoad?.({ id: "1" });

    await Promise.all([first, second]);

    expect(onMiss).toHaveBeenCalledOnce();
    expect(onHit).toHaveBeenCalledOnce();
  });
});

it("does not cache a result rejected by shouldCache", async () => {
  const redis = createRedis();
  const load = vi.fn(async () => [] as string[]);

  await readThroughCache({
    redis,
    key: "trending:top",
    ttlSeconds: 120,
    shouldCache: (items) => items.length > 0,
    load,
  });

  const writesToTrendingCache = redis.set.mock.calls.filter(
    ([key]) => key === "trending:top",
  );

  expect(writesToTrendingCache).toHaveLength(0);
});
