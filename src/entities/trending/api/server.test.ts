import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getItemsByIds: vi.fn(),
  readThroughCache: vi.fn(),
  zrevrange: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/config/env", () => ({
  envServer: { trendingTopN: 10 },
}));

vi.mock("@/entities/item/api/server", () => ({
  getItemsByIds: mocks.getItemsByIds,
}));

vi.mock("@/server/cache/client", () => ({
  redis: { zrevrange: mocks.zrevrange },
}));

vi.mock("@/server/cache/cache-aside", () => ({
  readThroughCache: mocks.readThroughCache,
  withRedisTimeout: <T>(operation: Promise<T>) => operation,
}));

vi.mock("@/server/cache/keys", () => ({
  cacheKeys: {
    trendingItems: () => "trending:items",
    trendingTop: () => "cat:v1:trending:top",
  },
}));

import { getTrendingItems } from "./server";

describe("getTrendingItems", () => {
  it("loads all Trending items through one batch query", async () => {
    mocks.zrevrange.mockResolvedValue(["item-1", "item-2"]);
    mocks.getItemsByIds.mockResolvedValue([{ id: "item-1" }, { id: "item-2" }]);
    mocks.readThroughCache.mockImplementation(async (options: { load: () => Promise<unknown> }) => options.load());

    await expect(getTrendingItems()).resolves.toEqual([{ id: "item-1" }, { id: "item-2" }]);
    expect(mocks.getItemsByIds).toHaveBeenCalledWith(["item-1", "item-2"]);
  });
});
