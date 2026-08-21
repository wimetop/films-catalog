import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: dbMocks }));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { getItemById } from "./server";

describe("getItemById", () => {
  it("returns null without querying Postgres for an invalid UUID", async () => {
    await expect(getItemById("not-a-uuid")).resolves.toBeNull();
    expect(dbMocks.select).not.toHaveBeenCalled();
  });
});
