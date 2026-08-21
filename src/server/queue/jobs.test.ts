import { beforeEach, describe, expect, it, vi } from "vitest";

const { add, set } = vi.hoisted(() => ({
  add: vi.fn(),
  set: vi.fn(),
}));

vi.mock("./client", () => ({
  getCatalogQueue: () => ({ add }),
}));

vi.mock("@/server/cache/client", () => ({
  redis: { set, del: vi.fn() },
}));

import { enqueueFavoriteRecount } from "./jobs";

describe("enqueueFavoriteRecount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    set.mockResolvedValue("OK");
    add.mockResolvedValue(undefined);
  });

  it("uses a BullMQ-safe job ID for an outbox event", async () => {
    await enqueueFavoriteRecount({ itemId: "0c7fc962-fc6f-4af2-a529-a5550a000010" });

    const options = add.mock.calls[0][2] as { jobId: string };
    expect(options.jobId).not.toContain(":");
  });
});
