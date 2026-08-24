import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/cache/stats", () => ({
  cacheStats: { snapshot: () => ({ itemsList: { hits: 1, misses: 0, ratio: 1 } }) },
}));

import { GET } from "./route";

describe("GET /api/cache/stats", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not expose process-local metrics in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    expect((await GET()).status).toBe(404);
  });
});
