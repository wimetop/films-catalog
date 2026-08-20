import { describe, expect, it } from "vitest";

import { isForeignKeyViolation } from "./favorite-errors";

describe("isForeignKeyViolation", () => {
  it("recognizes a PostgreSQL foreign-key violation", () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
  });

  it("does not hide unrelated database errors", () => {
    expect(isForeignKeyViolation({ code: "23505" })).toBe(false);
  });
});
