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
  it("queues the first request and reconnects with a bounded backoff", async () => {
    await import("./client");

    const options = createdOptions[0] as {
      enableOfflineQueue: boolean;
      lazyConnect: boolean;
      maxRetriesPerRequest: number;
      retryStrategy: (attempt: number) => number;
    };

    expect(options).toMatchObject({
      lazyConnect: true,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 2,
    });
    expect(options.retryStrategy(1)).toBeGreaterThanOrEqual(200);
    expect(options.retryStrategy(1)).toBeLessThan(300);
    expect(options.retryStrategy(100)).toBeLessThanOrEqual(2_000);
  });
});
