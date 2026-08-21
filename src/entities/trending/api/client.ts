import type { Item } from "@/entities/item/model/types";

export async function fetchTrendingItems(): Promise<Item[]> {
  const response = await fetch("/api/trending");
  if (!response.ok) throw new Error("Не вдалося завантажити популярні фільми.");
  return response.json() as Promise<Item[]>;
}
