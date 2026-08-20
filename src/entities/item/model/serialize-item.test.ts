import { describe, expect, it } from "vitest";

import { serializeItem } from "./serialize-item";

describe("serializeItem", () => {
  it("serializes the database timestamp for client cache data", () => {
    expect(
      serializeItem({
        id: "97f6eaca-529b-43c4-8363-815d00b1c8e4",
        title: "Arrival",
        description: "A linguist communicates with visitors.",
        imageUrl: null,
        createdAt: new Date("2026-08-20T12:00:00.000Z"),
      }),
    ).toEqual({
      id: "97f6eaca-529b-43c4-8363-815d00b1c8e4",
      title: "Arrival",
      description: "A linguist communicates with visitors.",
      imageUrl: null,
      createdAt: "2026-08-20T12:00:00.000Z",
    });
  });
});
