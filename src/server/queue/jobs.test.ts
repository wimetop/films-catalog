import { beforeEach, describe, expect, it, vi } from "vitest";

const { catalogAdd, favoritesAdd, getJobScheduler, set, upsertJobScheduler } = vi.hoisted(() => ({
  catalogAdd: vi.fn(),
  favoritesAdd: vi.fn(),
  getJobScheduler: vi.fn(),
  set: vi.fn(),
  upsertJobScheduler: vi.fn(),
}));

vi.mock("./client", () => ({
  getCatalogQueue: () => ({ add: catalogAdd, getJobScheduler, upsertJobScheduler }),
  getFavoritesQueue: () => ({ add: favoritesAdd }),
}));

vi.mock("@/config/env", () => ({
  envServer: { trendingRebuildCron: "*/17 * * * *" },
}));

vi.mock("@/server/cache/client", () => ({
  redis: { set, del: vi.fn() },
}));

import { enqueueCacheWarm, enqueueFavoriteRecount, registerOutboxPublisher, registerTrendingRebuild } from "./jobs";

describe("enqueueFavoriteRecount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJobScheduler.mockResolvedValue({ pattern: "*/17 * * * *" });
    set.mockResolvedValue("OK");
    catalogAdd.mockResolvedValue(undefined);
    favoritesAdd.mockResolvedValue(undefined);
  });

  it("enqueues one batch recount job on the isolated favorites queue", async () => {
    await enqueueFavoriteRecount({ itemIds: ["0c7fc962-fc6f-4af2-a529-a5550a000010", "0c7fc962-fc6f-4af2-a529-a5550a000011"] });

    expect(favoritesAdd).toHaveBeenCalledWith(
      "favorites:recount",
      { itemIds: ["0c7fc962-fc6f-4af2-a529-a5550a000010", "0c7fc962-fc6f-4af2-a529-a5550a000011"] },
      expect.any(Object),
    );
    expect(catalogAdd).not.toHaveBeenCalled();

    expect(favoritesAdd.mock.calls[0][2]).not.toHaveProperty("jobId");
  });

  it("sets retention for every outbox scheduler job", async () => {
    await registerOutboxPublisher();

    for (const call of upsertJobScheduler.mock.calls) {
      const template = call[2] as { opts?: { removeOnComplete?: unknown; removeOnFail?: unknown } };
      expect(template.opts?.removeOnComplete).toBeDefined();
      expect(template.opts?.removeOnFail).toBeDefined();
    }
  });

  it("uses the validated trending cron configuration", async () => {
    await registerTrendingRebuild();

    expect(upsertJobScheduler).toHaveBeenCalledWith(
      "trending:rebuild:scheduled",
      { pattern: "*/17 * * * *" },
      expect.any(Object),
    );
  });

  it("creates a new cache warm job after each catalog invalidation", async () => {
    await enqueueCacheWarm();
    await enqueueCacheWarm();

    expect(catalogAdd).toHaveBeenCalledTimes(2);
    expect(catalogAdd.mock.calls[0][2]).not.toHaveProperty("jobId");
    expect(catalogAdd.mock.calls[1][2]).not.toHaveProperty("jobId");
  });
});
