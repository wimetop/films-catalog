import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { routes } from "@/config/constants";

import type { Item } from "../model/types";

type ItemCardProps = { item: Item; action?: ReactNode };

export function ItemCard({ item, action }: ItemCardProps) {
  return (
    <article className="film-card">
      <div className="film-poster" aria-hidden="true">
        {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" unoptimized /> : <span>{item.title.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="film-card__content">
        <h2 className="film-card__title">{item.title}</h2>
        <p className="film-card__description">{item.description ?? "Опис цього фільму ще не додано."}</p>
        <Link className="text-link" href={routes.item(item.id)}>Відкрити картку <span aria-hidden="true">→</span></Link>
        {action}
      </div>
    </article>
  );
}
