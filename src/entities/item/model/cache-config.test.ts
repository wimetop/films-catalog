import { describe, expect, it } from "vitest";

import { catalogCacheConfig } from "./cache-config";

describe("catalogCacheConfig", () => {
  it("keeps public catalog data fresh for one minute", () => {
    expect(catalogCacheConfig.revalidate).toBe(60);
    expect(catalogCacheConfig.tags).toEqual(["items"]);
  });
});
