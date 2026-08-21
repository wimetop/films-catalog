import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

import { getFavoriteItemIds } from "@/entities/favorite/api/server";
import { favoriteKeys } from "@/entities/favorite/model/query-keys";
import { getItems } from "@/entities/item";
import { itemKeys } from "@/entities/item/model/query-keys";
import { getCurrentSession } from "@/entities/session";
import { getTrendingItems } from "@/entities/trending/api/server";
import { trendingKeys } from "@/entities/trending/model/query-keys";
import { getQueryClient } from "@/shared/lib/react-query/get-query-client";
import { CatalogPage } from "@/views/catalog/ui/catalog-page";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  return (
    <main className="page-shell">
      <Suspense fallback={<p className="notice">Завантажуємо каталог…</p>}>
        <ItemsContent />
      </Suspense>
    </main>
  );
}

async function ItemsContent() {
  const queryClient = getQueryClient();
  const [, session] = await Promise.all([
    queryClient.prefetchQuery({ queryKey: itemKeys.all, queryFn: () => getItems() }),
    getCurrentSession(),
    queryClient.prefetchQuery({ queryKey: trendingKeys.all, queryFn: getTrendingItems }),
  ]);

  if (session) {
    await queryClient.prefetchQuery({
      queryKey: favoriteKeys.ids(session.user.id),
      queryFn: () => getFavoriteItemIds(session.user.id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CatalogPage userId={session?.user.id ?? null} />
    </HydrationBoundary>
  );
}
