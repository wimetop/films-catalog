import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://runtime.example/catalog";
  process.env.DIRECT_URL = "postgresql://direct.example/catalog";
  process.env.BETTER_AUTH_SECRET = "a-secret-that-is-at-least-thirty-two-chars";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.CACHE_TTL_LIST = "60";
  process.env.CACHE_TTL_ITEM = "300";
  process.env.TRENDING_TOP_N = "10";
  process.env.TRENDING_REBUILD_CRON = "*/5 * * * *";
});

import { envServer } from "./env.server";

describe("envServer", () => {
  it("exposes validated Redis cache settings", () => {
    expect(envServer).toMatchObject({
      cacheTtlItem: expect.any(Number),
      cacheTtlList: expect.any(Number),
      redisUrl: expect.any(String),
      trendingRebuildCron: expect.any(String),
      trendingTopN: expect.any(Number),
    });
  });

  it("rejects an invalid cache TTL during startup", async () => {
    process.env.CACHE_TTL_LIST = "not-a-number";
    vi.resetModules();

    await expect(import("./env.server")).rejects.toThrow("CACHE_TTL_LIST");
  });

  it("rejects a missing Redis URL during startup", async () => {
    process.env.CACHE_TTL_LIST = "60";
    delete process.env.REDIS_URL;
    vi.resetModules();

    await expect(import("./env.server")).rejects.toThrow("REDIS_URL");
  });
});
