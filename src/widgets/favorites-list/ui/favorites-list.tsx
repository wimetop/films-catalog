"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFavorites } from "@/entities/favorite/api/client";
import { favoriteKeys } from "@/entities/favorite/model/query-keys";
import type { Item } from "@/entities/item/model/types";
import { ItemCard } from "@/entities/item/ui/item-card";
import { FavoriteButton } from "@/features/toggle-favorite/ui/favorite-button";

type FavoritesListProps = { initialFavorites: Item[]; userId: string };

export function FavoritesList({ initialFavorites, userId }: FavoritesListProps) {
  const { data: favorites = initialFavorites, isError } = useQuery({
    queryKey: favoriteKeys.all(userId),
    queryFn: fetchFavorites,
    initialData: initialFavorites,
  });

  if (isError) return <p className="notice" role="alert">Не вдалося оновити обране.</p>;
  if (!favorites.length) return <p className="empty-state">Тут поки що порожньо. Додайте фільм із каталогу.</p>;

  return <div className="film-grid">{favorites.map((item) => <ItemCard key={item.id} item={item} action={<FavoriteButton item={item} initialFavorites={initialFavorites} userId={userId} />} />)}</div>;
}
