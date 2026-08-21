import Link from "next/link";

import { routes } from "@/config/constants";

import type { Item } from "../model/types";
import { FavoriteButton } from "@/features/toggle-favorite/ui/favorite-button";

type ItemDetailsProps = { item: Item; userId: string | null };

export function ItemDetails({ item, userId }: ItemDetailsProps) {
  return (
    <article className="film-details">
      <Link className="text-link details-back" href={routes.items}>← До каталогу</Link>
      <p className="eyebrow">Картка фільму</p>
      <h1>{item.title}</h1>
      <div className="details-rule" />
      <p className="film-details__description">{item.description ?? "Опис цього фільму ще не додано."}</p>
      {userId ? <FavoriteButton item={item} userId={userId} /> : null}
      <p className="film-details__meta">Додано до каталогу: {new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(new Date(item.createdAt))}</p>
    </article>
  );
}
