import type { Item } from "../model/types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) throw new Error("Не вдалося завантажити дані.");

  return response.json() as Promise<T>;
}

export const fetchItems = () => getJson<Item[]>("/api/items");
export const fetchItemById = (id: string) => getJson<Item>(`/api/items/${id}`);
