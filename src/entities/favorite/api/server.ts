import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { favorites, items } from "@/db/schema";
import { serializeItem } from "@/entities/item/model/serialize-item";
import type { Item } from "@/entities/item/model/types";

const itemSelection = {
  id: items.id,
  title: items.title,
  description: items.description,
  imageUrl: items.imageUrl,
  createdAt: items.createdAt,
};

export async function getFavoriteItems(userId: string): Promise<Item[]> {
  const favoriteItems = await db
    .select(itemSelection)
    .from(favorites)
    .innerJoin(items, eq(favorites.itemId, items.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));

  return favoriteItems.map(serializeItem);
}

export async function addFavorite(userId: string, itemId: string) {
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  if (!item) return false;

  await db.insert(favorites).values({ userId, itemId }).onConflictDoNothing();

  return true;
}

export async function removeFavorite(userId: string, itemId: string) {
  await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.itemId, itemId)));
}
