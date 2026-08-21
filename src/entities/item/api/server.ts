import "server-only";

import { desc, eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";

import { db } from "@/db";
import { items } from "@/db/schema";
import { isUuid } from "@/shared/lib/is-uuid";

import type { Item } from "../model/types";
import { serializeItem } from "../model/serialize-item";
import { catalogCacheConfig } from "../model/cache-config";

const itemSelection = {
  id: items.id,
  title: items.title,
  description: items.description,
  imageUrl: items.imageUrl,
  createdAt: items.createdAt,
};

async function readItems(): Promise<Item[]> {
  const itemList = await db
    .select(itemSelection)
    .from(items)
    .orderBy(desc(items.createdAt));

  return itemList.map(serializeItem);
}

export const getItems = unstable_cache(readItems, ["items-list"], catalogCacheConfig);

export async function getItemById(id: string): Promise<Item | null> {
  if (!isUuid(id)) return null;

  const [item] = await db
    .select(itemSelection)
    .from(items)
    .where(eq(items.id, id))
    .limit(1);

  return item ? serializeItem(item) : null;
}

export type CreateItemInput = {
  title: string;
  description: string | null;
  imageUrl: string | null;
};

export async function createItem(input: CreateItemInput): Promise<Item> {
  const [created] = await db.insert(items).values(input).returning(itemSelection);

  return serializeItem(created);
}

/** Marks every cached catalog response as stale after a catalog write. */
export function revalidateCatalog(): void {
  for (const tag of catalogCacheConfig.tags) {
    revalidateTag(tag, "max");
  }
}
