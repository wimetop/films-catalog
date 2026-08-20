import { notFound } from "next/navigation";

import { getItemById } from "@/entities/item";
import { getFavoriteItems } from "@/entities/favorite/api/server";
import { getCurrentSession } from "@/entities/session";
import { ItemDetailsPage } from "@/views/item-details/ui/item-details-page";

export const dynamic = "force-dynamic";

type ItemPageProps = { params: Promise<{ id: string }> };

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  const [item, session] = await Promise.all([getItemById(id), getCurrentSession()]);

  if (!item) notFound();

  const favorites = session ? await getFavoriteItems(session.user.id) : [];

  return <main className="page-shell"><ItemDetailsPage initialItem={item} initialFavorites={favorites} userId={session?.user.id ?? null} /></main>;
}
