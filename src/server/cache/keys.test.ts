import { describe, expect, it } from "vitest";

import { cacheKeys } from "./keys";

describe("cacheKeys", () => {
  it("builds versioned public catalog keys", () => {
    expect(cacheKeys.itemsList(1, 20)).toBe("cat:v1:items:list:v1:1:20");
    expect(cacheKeys.item("item-123")).toBe("cat:v1:item:item-123");
    expect(cacheKeys.trendingTop()).toBe("cat:v1:trending:top");
  });

  it("does not expose unused favorite cache keys", () => {
    expect(cacheKeys).not.toHaveProperty("favoriteCount");
    expect(cacheKeys).not.toHaveProperty("favoriteList");
  });
});
