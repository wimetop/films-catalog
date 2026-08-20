import type { Item } from "./types";

type ItemDatabaseRecord = Omit<Item, "createdAt"> & { createdAt: Date };

export function serializeItem(item: ItemDatabaseRecord): Item {
  return { ...item, createdAt: item.createdAt.toISOString() };
}
