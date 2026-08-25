import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { outboxEvents } from "./outbox-event";

describe("outbox events schema", () => {
  it("declares every index created by the outbox migrations", () => {
    const indexes = getTableConfig(outboxEvents).indexes;

    expect(indexes.map((index) => index.config.name)).toEqual(expect.arrayContaining([
      "outbox_events_pending_idx",
      "outbox_events_terminal_idx",
    ]));
    expect(indexes.find((index) => index.config.name === "outbox_events_pending_idx")?.config.where).toBeDefined();
    expect(indexes.find((index) => index.config.name === "outbox_events_delivered_idx")).toBeUndefined();
    expect(indexes.find((index) => index.config.name === "outbox_events_terminal_idx")?.config.where).toBeDefined();
  });
});
