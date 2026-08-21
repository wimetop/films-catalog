import { describe, expect, it } from "vitest";

import { makeQueryClient } from "./make-query-client";

describe("makeQueryClient", () => {
  it("uses the catalog cache defaults on both server and client", () => {
    const queryClient = makeQueryClient();

    expect(queryClient.getDefaultOptions().queries).toMatchObject({
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    });
  });
});
