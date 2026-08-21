import { describe, expect, it } from "vitest";

import { favoriteKeys } from "./query-keys";

describe("favoriteKeys", () => {
  it("partitions both favorite views by user", () => {
    expect(favoriteKeys.ids("user-a")).not.toEqual(favoriteKeys.ids("user-b"));
    expect(favoriteKeys.list("user-a")).not.toEqual(favoriteKeys.list("user-b"));
  });

  it("keeps the ids and full-list caches separate", () => {
    expect(favoriteKeys.ids("user-a")).not.toEqual(favoriteKeys.list("user-a"));
  });
});
