"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchItems } from "@/entities/item/api/client";
import { itemKeys } from "@/entities/item/model/query-keys";
import type { Item } from "@/entities/item/model/types";
import { FavoriteButton } from "@/features/toggle-favorite/ui/favorite-button";
import { ItemCard } from "@/entities/item/ui/item-card";

type ItemsCatalogProps = { initialItems: Item[]; initialFavorites: Item[]; userId: string | null };

export function ItemsCatalog({ initialItems, initialFavorites, userId }: ItemsCatalogProps) {
  const { data: items = initialItems, isFetching, isError } = useQuery({
    queryKey: itemKeys.all,
    queryFn: fetchItems,
    initialData: initialItems,
  });

  return (
    <section aria-labelledby="catalog-title">
      <div className="section-heading">
        <div><p className="eyebrow">Колекція</p><h1 id="catalog-title">Фільми для вашого вечора</h1></div>
        <p className="catalog-status" aria-live="polite">{isFetching ? "Оновлюємо каталог…" : `${items.length} фільмів`}</p>
      </div>
      {isError ? <p className="notice" role="alert">Не вдалося оновити каталог. Показуємо останню доступну версію.</p> : null}
      <div className="film-grid">{items.map((item) => <ItemCard key={item.id} item={item} action={userId ? <FavoriteButton item={item} initialFavorites={initialFavorites} userId={userId} /> : undefined} />)}</div>
    </section>
  );
}
