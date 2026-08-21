import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { routes } from "@/config/constants";
import { getFavoriteItems } from "@/entities/favorite/api/server";
import { favoriteKeys } from "@/entities/favorite/model/query-keys";
import { getCurrentSession } from "@/entities/session";
import { getQueryClient } from "@/shared/lib/react-query/get-query-client";
import { FavoritesPage } from "@/views/favorites/ui/favorites-page";


export default async function FavoritesRoute() {
  return (
    <main className="page-shell">
      <Suspense fallback={<p className="notice">Завантажуємо обране…</p>}>
        <FavoritesContent />
      </Suspense>
    </main>
  );
}

async function FavoritesContent() {
  const session = await getCurrentSession();

  if (!session) redirect(`${routes.login}?next=${encodeURIComponent(routes.favorites)}`);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: favoriteKeys.list(session.user.id),
    queryFn: () => getFavoriteItems(session.user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FavoritesPage userId={session.user.id} />
    </HydrationBoundary>
  );
}
