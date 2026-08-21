import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getItemById } from "@/entities/item";
import { getFavoriteItemIds } from "@/entities/favorite/api/server";
import { favoriteKeys } from "@/entities/favorite/model/query-keys";
import { getCurrentSession } from "@/entities/session";
import { getQueryClient } from "@/shared/lib/react-query/get-query-client";
import { ItemDetailsPage } from "@/views/item-details/ui/item-details-page";

type ItemPageProps = { params: Promise<{ id: string }> };

export default async function ItemPage({ params }: ItemPageProps) {
  return (
    <main className="page-shell">
      <Suspense fallback={<p className="notice">Завантажуємо картку фільму…</p>}>
        <ItemContent params={params} />
      </Suspense>
    </main>
  );
}

async function ItemContent({ params }: ItemPageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();
  const [item, session] = await Promise.all([getItemById(id), getCurrentSession()]);

  if (!item) notFound();

  if (session) {
    await queryClient.prefetchQuery({
      queryKey: favoriteKeys.ids(session.user.id),
      queryFn: () => getFavoriteItemIds(session.user.id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ItemDetailsPage item={item} userId={session?.user.id ?? null} />
    </HydrationBoundary>
  );
}
