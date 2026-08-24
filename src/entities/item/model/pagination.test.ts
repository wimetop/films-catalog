import { describe, expect, it } from "vitest";

import { normalizeCatalogPagination } from "./pagination";

describe("normalizeCatalogPagination", () => {
  it("maps arbitrary page sizes to a bounded cache-key set", () => {
    expect(normalizeCatalogPagination("12", "37")).toEqual({
      page: 12,
      pageSize: 50,
    });
    expect(normalizeCatalogPagination("12", "99")).toEqual({
      page: 12,
      pageSize: 100,
    });
  });

  it("caps the page number used in Redis cache keys", () => {
    expect(normalizeCatalogPagination("999999", "20")).toEqual({
      page: 1000,
      pageSize: 20,
    });
  });
});
