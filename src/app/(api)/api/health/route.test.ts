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

  it("returns 503 when Redis is down", async () => {
    mocks.dbExecute.mockResolvedValue([]);
    mocks.redisPing.mockRejectedValue(new Error("down"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "down",
      database: "ok",
      redis: "down",
    });
  });

  it("returns 503 promptly when Redis ping never settles", async () => {
    mocks.dbExecute.mockResolvedValue([]);
    mocks.redisPing.mockReturnValue(new Promise(() => undefined));

    const response = await Promise.race([
      GET(),
      new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("health did not degrade within 750ms")), 750);
      }),
    ]);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "down",
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

  it("returns normalized 503 when both database and Redis are down", async () => {
    mocks.dbExecute.mockRejectedValue(new Error("database secret"));
    mocks.redisPing.mockRejectedValue(new Error("Redis secret"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "down",
      database: "down",
      redis: "down",
    });
  });

  it("starts both dependency checks before either settles", async () => {
    let resolveDatabase!: (value: unknown) => void;
    let resolveRedis!: (value: string) => void;
    const databaseCheck = new Promise((resolve) => {
      resolveDatabase = resolve;
    });
    const redisCheck = new Promise<string>((resolve) => {
      resolveRedis = resolve;
    });
    mocks.dbExecute.mockReturnValue(databaseCheck);
    mocks.redisPing.mockReturnValue(redisCheck);

    const responsePromise = GET();

    expect(mocks.dbExecute).toHaveBeenCalledWith("select 1");
    expect(mocks.redisPing).toHaveBeenCalledOnce();

    resolveDatabase([]);
    resolveRedis("PONG");
    await expect(responsePromise).resolves.toHaveProperty("status", 200);
  });
});
