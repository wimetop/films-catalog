import { describe, expect, it, vi } from "vitest";

const { createdOptions } = vi.hoisted(() => ({ createdOptions: [] as Array<Record<string, unknown>> }));

vi.mock("@/config/env", () => ({
  envServer: { redisUrl: "redis://localhost:6379" },
}));

vi.mock("ioredis", () => ({
  default: class Redis {
    status = "wait";

    constructor(_: string, options: Record<string, unknown>) {
      createdOptions.push(options);
    }

    on() {
      return this;
    }
  },
}));

describe("Redis cache client", () => {
  it("queues the first request while a lazy connection is opening", async () => {
    await import("./client");

    expect(createdOptions[0]).toMatchObject({
      lazyConnect: true,
      enableOfflineQueue: true,
    });
  });
});
