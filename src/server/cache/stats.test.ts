import { describe, expect, it } from "vitest";

import { createCacheStats } from "./stats";

describe("createCacheStats", () => {
  it("calculates hit ratio separately for a catalog list and item details", () => {
    const stats = createCacheStats();

    stats.record("itemsList", "miss");
    stats.record("itemsList", "hit");
    stats.record("itemsList", "hit");
    stats.record("itemDetails", "miss");

    expect(stats.snapshot()).toEqual({
      itemDetails: { hits: 0, misses: 1, ratio: 0 },
      itemsList: { hits: 2, misses: 1, ratio: 2 / 3 },
    });
  });
});
