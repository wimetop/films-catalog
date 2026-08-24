import { describe, expect, it } from "vitest";

import { batchOutboxItemIds, maxOutboxDeliveryAttempts, shouldDeadLetterOutboxEvent } from "./outbox";

describe("shouldDeadLetterOutboxEvent", () => {
  it("keeps retrying before the maximum attempt count", () => {
    expect(shouldDeadLetterOutboxEvent(maxOutboxDeliveryAttempts - 1)).toBe(false);
  });

  it("dead-letters an event at the maximum attempt count", () => {
    expect(shouldDeadLetterOutboxEvent(maxOutboxDeliveryAttempts)).toBe(true);
  });
});

describe("batchOutboxItemIds", () => {
  it("deduplicates repeated item events before queueing a recount", () => {
    expect(batchOutboxItemIds([
      { itemId: "item-a" },
      { itemId: "item-a" },
      { itemId: "item-b" },
    ])).toEqual(["item-a", "item-b"]);
  });
});
