import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbExecute: vi.fn(),
  redisPing: vi.fn(),
}));

vi.mock("@/db", () => ({
  dbClient: { execute: mocks.dbExecute },
}));

vi.mock("@/server/cache/client", () => ({
  redis: { ping: mocks.redisPing },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when database and Redis respond", async () => {
    mocks.dbExecute.mockResolvedValue([]);
    mocks.redisPing.mockResolvedValue("PONG");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      database: "ok",
      redis: "ok",
    });
  });

  it("returns degraded 200 when only Redis is down", async () => {
    mocks.dbExecute.mockResolvedValue([]);
    mocks.redisPing.mockRejectedValue(new Error("down"));

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "degraded",
      database: "ok",
      redis: "down",
    });
  });

  it("returns 503 when database is down", async () => {
    mocks.dbExecute.mockRejectedValue(new Error("down"));
    mocks.redisPing.mockResolvedValue("PONG");

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "down",
      database: "down",
    });
  });
});
