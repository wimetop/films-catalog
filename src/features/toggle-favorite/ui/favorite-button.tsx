"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addFavoriteRequest, fetchFavorites, removeFavoriteRequest } from "@/entities/favorite/api/client";
import { favoriteKeys } from "@/entities/favorite/model/query-keys";
import type { Item } from "@/entities/item/model/types";

type FavoriteButtonProps = { item: Item; initialFavorites: Item[]; userId: string };

export function FavoriteButton({ item, initialFavorites, userId }: FavoriteButtonProps) {
  const queryClient = useQueryClient();
  const queryKey = favoriteKeys.all(userId);
  const { data: favorites = initialFavorites } = useQuery({
    queryKey,
    queryFn: fetchFavorites,
    initialData: initialFavorites,
  });
  const isFavorite = favorites.some((favorite) => favorite.id === item.id);

  const mutation = useMutation({
    mutationFn: () => isFavorite ? removeFavoriteRequest(item.id) : addFavoriteRequest(item.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousFavorites = queryClient.getQueryData<Item[]>(queryKey) ?? [];
      queryClient.setQueryData<Item[]>(queryKey, isFavorite ? previousFavorites.filter((favorite) => favorite.id !== item.id) : [item, ...previousFavorites]);
      return { previousFavorites };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(queryKey, context?.previousFavorites);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <button className="favorite-button" type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? "Зберігаємо…" : isFavorite ? "Прибрати з обраного" : "Додати в обране"}
    </button>
  );
}
