import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { favorites } from "./favorite";

describe("favorites schema", () => {
  it("indexes itemId for recount queries", () => {
    const config = getTableConfig(favorites);
    const itemIdIndex = config.indexes.find(
      (index) => index.config.name === "favorites_item_id_idx",
    );

    expect(itemIdIndex).toBeDefined();
    expect(itemIdIndex?.config.columns).toHaveLength(1);
    expect(itemIdIndex?.config.columns[0]).toMatchObject({ name: "item_id" });
  });
});
