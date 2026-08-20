"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { routes } from "@/config/constants";

import { fetchItemById } from "../api/client";
import { itemKeys } from "../model/query-keys";
import type { Item } from "../model/types";
import { FavoriteButton } from "@/features/toggle-favorite/ui/favorite-button";

type ItemDetailsProps = { initialItem: Item; initialFavorites: Item[]; userId: string | null };

export function ItemDetails({ initialItem, initialFavorites, userId }: ItemDetailsProps) {
  const { data: item = initialItem, isFetching, isError } = useQuery({
    queryKey: itemKeys.detail(initialItem.id),
    queryFn: () => fetchItemById(initialItem.id),
    initialData: initialItem,
  });

  return (
    <article className="film-details">
      <Link className="text-link details-back" href={routes.items}>← До каталогу</Link>
      <p className="eyebrow">Картка фільму {isFetching ? "· оновлюємо" : ""}</p>
      <h1>{item.title}</h1>
      <div className="details-rule" />
      <p className="film-details__description">{item.description ?? "Опис цього фільму ще не додано."}</p>
      {userId ? <FavoriteButton item={item} initialFavorites={initialFavorites} userId={userId} /> : null}
      <p className="film-details__meta">Додано до каталогу: {new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(new Date(item.createdAt))}</p>
      {isError ? <p className="notice" role="alert">Не вдалося оновити дані фільму.</p> : null}
    </article>
  );
}
