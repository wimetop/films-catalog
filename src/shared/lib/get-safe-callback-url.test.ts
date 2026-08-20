import { describe, expect, it } from "vitest";

import { getSafeCallbackUrl } from "./get-safe-callback-url";

describe("getSafeCallbackUrl", () => {
  it("keeps an internal callback URL", () => {
    expect(getSafeCallbackUrl("/favorites")).toBe("/favorites");
  });

  it("rejects external callback URLs", () => {
    expect(getSafeCallbackUrl("//attacker.example")).toBe("/favorites");
  });

  it("rejects a backslash URL that the browser normalizes to another origin", () => {
    expect(getSafeCallbackUrl("/\\\\attacker.example")).toBe("/favorites");
  });
});
