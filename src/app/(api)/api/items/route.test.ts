import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createItem: vi.fn(),
  getCurrentSession: vi.fn(),
  getItems: vi.fn(),
  revalidateCatalog: vi.fn(),
}));

vi.mock("@/entities/item", () => ({
  createItem: mocks.createItem,
  getItems: mocks.getItems,
  revalidateCatalog: mocks.revalidateCatalog,
}));

vi.mock("@/entities/session", () => ({
  getCurrentSession: mocks.getCurrentSession,
}));

import { POST } from "./route";

describe("POST /api/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects guests before creating an item", async () => {
    mocks.getCurrentSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/items", {
        body: JSON.stringify({ title: "Arrival" }),
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
    expect(mocks.createItem).not.toHaveBeenCalled();
  });

  it("creates a normalized item and invalidates the catalog cache", async () => {
    const created = {
      createdAt: "2026-08-21T12:00:00.000Z",
      description: null,
      id: "b16233b1-cfa4-4d80-91a3-3e2bca07edbb",
      imageUrl: null,
      title: "Arrival",
    };

    mocks.getCurrentSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.createItem.mockResolvedValue(created);

    const response = await POST(
      new Request("http://localhost/api/items", {
        body: JSON.stringify({
          description: "   ",
          imageUrl: "  ",
          title: "  Arrival  ",
        }),
        method: "POST",
      }),
    );

    expect(mocks.createItem).toHaveBeenCalledWith({
      description: null,
      imageUrl: null,
      title: "Arrival",
    });
    expect(mocks.revalidateCatalog).toHaveBeenCalledOnce();
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(created);
  });
});
