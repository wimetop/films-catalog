import { describe, expect, it } from "vitest";

import { favoriteKeys } from "./query-keys";

describe("favoriteKeys", () => {
  it("partitions cached favorites by user", () => {
    expect(favoriteKeys.all("user-a")).not.toEqual(favoriteKeys.all("user-b"));
  });
});
