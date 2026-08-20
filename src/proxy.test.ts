import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("proxy", () => {
  it("redirects an unauthenticated favorites request to login", async () => {
    const request = new NextRequest("http://localhost:3000/favorites");

    const response = await proxy(request);
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/favorites");
  });
});
