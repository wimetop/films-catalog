import { describe, expect, it } from "vitest";

import { isUuid } from "./is-uuid";

describe("isUuid", () => {
  it("accepts a UUID", () => {
    expect(isUuid("0c7fc962-fc6f-4af2-a529-a5550a000001")).toBe(true);
  });

  it("rejects an invalid UUID", () => {
    expect(isUuid("not-an-item-id")).toBe(false);
  });
});
