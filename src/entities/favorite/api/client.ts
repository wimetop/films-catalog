import type { Item } from "@/entities/item/model/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) throw new Error("Не вдалося змінити обране.");

  return response.json() as Promise<T>;
}

export const fetchFavorites = () => request<Item[]>("/api/favorites");
export const addFavoriteRequest = (itemId: string) => request<{ ok: true }>("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId }) });
export const removeFavoriteRequest = (itemId: string) => request<{ ok: true }>(`/api/favorites/${itemId}`, { method: "DELETE" });
