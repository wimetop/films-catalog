import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  expire: vi.fn(),
  exec: vi.fn(),
  getFavoriteCountsForItems: vi.fn(),
  multi: vi.fn(),
  zadd: vi.fn(),
  zrem: vi.fn(),
  getFailed: vi.fn(),
}));

vi.mock("@/entities/favorite/api/server", () => ({
  cleanupDeliveredOutboxEvents: vi.fn(),
  getFavoriteCountsForItems: mocks.getFavoriteCountsForItems,
  getFavoriteCounts: vi.fn(),
  publishPendingOutboxEvents: vi.fn(),
}));

vi.mock("@/server/cache/client", () => ({
  redis: {
    del: mocks.del,
    expire: mocks.expire,
    multi: mocks.multi,
    zadd: mocks.zadd,
    zrem: mocks.zrem,
  },
}));

vi.mock("@/server/cache/keys", () => ({
  cacheKeys: {
    trendingItems: () => "trending:items",
    trendingTop: () => "cat:v1:trending:top",
  },
}));

vi.mock("@/server/queue/names", () => ({
  queueNames: {},
}));

vi.mock("@/entities/item/api/catalog-service", () => ({
  getItems: vi.fn(),
}));

vi.mock("@/server/queue/jobs", () => ({
  enqueueFavoriteRecount: vi.fn(),
}));

vi.mock("@/server/queue/client", () => ({
  getFavoritesQueue: () => ({ getFailed: mocks.getFailed }),
}));

import { processFavoriteRecount } from "./processors";

describe("processFavoriteRecount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.multi.mockReturnValue({
      del: mocks.del,
      expire: mocks.expire,
      exec: mocks.exec,
      zadd: mocks.zadd,
      zrem: mocks.zrem,
    });
    mocks.exec.mockResolvedValue([]);
  });

  it("removes every no-longer-favorited item in one batch", async () => {
    mocks.getFavoriteCountsForItems.mockResolvedValue([]);

    await processFavoriteRecount({
      itemIds: ["0c7fc962-fc6f-4af2-a529-a5550a000003", "0c7fc962-fc6f-4af2-a529-a5550a000004"],
    });

    expect(mocks.zrem).toHaveBeenCalledWith(
      "trending:items",
      "0c7fc962-fc6f-4af2-a529-a5550a000003",
      "0c7fc962-fc6f-4af2-a529-a5550a000004",
    );
    expect(mocks.zadd).not.toHaveBeenCalled();
    expect(mocks.del).toHaveBeenCalledWith("cat:v1:trending:top");
    expect(mocks.expire).not.toHaveBeenCalled();
  });

  it("fails the recount when Redis reports a command error from EXEC", async () => {
    mocks.getFavoriteCountsForItems.mockResolvedValue([]);
    mocks.exec.mockResolvedValue([[new Error("WRONGTYPE"), null]]);

    await expect(processFavoriteRecount({
      itemIds: ["0c7fc962-fc6f-4af2-a529-a5550a000003"],
    })).rejects.toThrow("WRONGTYPE");
  });
});
