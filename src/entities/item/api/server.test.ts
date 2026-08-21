import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({ readThroughCache: vi.fn(), withRedisTimeout: <T>(operation: Promise<T>) => operation }));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: dbMocks }));
vi.mock("@/server/cache/cache-aside", () => cacheMocks);
vi.mock("@/server/cache/client", () => ({ redis: { get: vi.fn(async () => "1") } }));
vi.mock("@/config/env", () => ({ envServer: { cacheTtlItem: 300, cacheTtlList: 60 } }));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { getItemById, getItems } from "./server";

describe("getItemById", () => {
  it("returns null without querying Postgres for an invalid UUID", async () => {
    await expect(getItemById("not-a-uuid")).resolves.toBeNull();
    expect(dbMocks.select).not.toHaveBeenCalled();
  });

  it("reads a valid item through the cache layer", async () => {
    cacheMocks.readThroughCache.mockResolvedValueOnce(null);

    await expect(getItemById("123e4567-e89b-12d3-a456-426614174000")).resolves.toBeNull();
    expect(cacheMocks.readThroughCache).toHaveBeenCalledOnce();
    expect(cacheMocks.readThroughCache).toHaveBeenCalledWith(expect.objectContaining({
      key: "cat:v1:item:123e4567-e89b-12d3-a456-426614174000",
      ttlSeconds: 300,
    }));
  });

  it("reads the catalog list through the cache layer", async () => {
    cacheMocks.readThroughCache.mockResolvedValueOnce([]);
    await expect(getItems()).resolves.toEqual([]);
    expect(cacheMocks.readThroughCache).toHaveBeenLastCalledWith(expect.objectContaining({
      key: "cat:v1:items:list:v1:0:0", ttlSeconds: 60,
    }));
  });
});
