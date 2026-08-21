"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addFavoriteRequest, fetchFavoriteIds, removeFavoriteRequest } from "@/entities/favorite/api/client";
import { favoriteKeys } from "@/entities/favorite/model/query-keys";
import type { Item } from "@/entities/item/model/types";

type FavoriteButtonProps = { item: Item; userId: string };

export function FavoriteButton({ item, userId }: FavoriteButtonProps) {
  const queryClient = useQueryClient();
  const idsQueryKey = favoriteKeys.ids(userId);
  const listQueryKey = favoriteKeys.list(userId);
  const { data: favoriteIds = [] } = useQuery({
    queryKey: idsQueryKey,
    queryFn: fetchFavoriteIds,
  });
  const isFavorite = favoriteIds.includes(item.id);

  const mutation = useMutation({
    mutationFn: () => isFavorite ? removeFavoriteRequest(item.id) : addFavoriteRequest(item.id),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: idsQueryKey }),
        queryClient.cancelQueries({ queryKey: listQueryKey }),
      ]);
      const previousIds = queryClient.getQueryData<string[]>(idsQueryKey) ?? [];
      const previousList = queryClient.getQueryData<Item[]>(listQueryKey);
      queryClient.setQueryData<string[]>(idsQueryKey, isFavorite ? previousIds.filter((id) => id !== item.id) : [...previousIds, item.id]);

      if (previousList) {
        queryClient.setQueryData<Item[]>(listQueryKey, isFavorite ? previousList.filter((favorite) => favorite.id !== item.id) : [item, ...previousList]);
      }

      return { previousIds, previousList };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(idsQueryKey, context?.previousIds);
      queryClient.setQueryData(listQueryKey, context?.previousList);
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: idsQueryKey }),
      queryClient.invalidateQueries({ queryKey: listQueryKey }),
    ]),
  });

  return (
    <button className="favorite-button" type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? "Зберігаємо…" : isFavorite ? "Прибрати з обраного" : "Додати в обране"}
    </button>
  );
}
