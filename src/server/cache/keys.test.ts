import { describe, expect, it } from "vitest";

import { cacheKeys } from "./keys";

describe("cacheKeys", () => {
  it("builds versioned public catalog keys", () => {
    expect(cacheKeys.itemsList(1, 20)).toBe("cat:v1:items:list:v1:1:20");
    expect(cacheKeys.item("item-123")).toBe("cat:v1:item:item-123");
    expect(cacheKeys.trendingTop()).toBe("cat:v1:trending:top");
  });

  it("isolates favorite-list keys by user", () => {
    expect(cacheKeys.favoriteList("user-a")).toBe("cat:v1:fav:list:user-a");
    expect(cacheKeys.favoriteList("user-a")).not.toBe(cacheKeys.favoriteList("user-b"));
  });
});
