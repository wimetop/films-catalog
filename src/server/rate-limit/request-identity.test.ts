import { afterEach, describe, expect, it, vi } from "vitest";

import { requestRateLimitIdentity } from "./request-identity";

describe("requestRateLimitIdentity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not put all public traffic into one bucket without a trusted proxy", () => {
    vi.stubEnv("TRUST_PROXY_FOR_RATE_LIMIT", "false");

    expect(
      requestRateLimitIdentity(
        new Request("https://catalog.test/api/items", {
          headers: { "x-forwarded-for": "198.51.100.15" },
        }),
      ),
    ).toBeNull();
  });

  it("uses the first forwarded address only when the proxy is trusted", () => {
    vi.stubEnv("TRUST_PROXY_FOR_RATE_LIMIT", "true");

    expect(
      requestRateLimitIdentity(
        new Request("https://catalog.test/api/items", {
          headers: { "x-forwarded-for": "198.51.100.15, 10.0.0.1" },
        }),
      ),
    ).toBe("198.51.100.15");
  });
});
