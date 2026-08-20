import { redirect } from "next/navigation";

import { routes } from "@/config/constants";
import { getFavoriteItems } from "@/entities/favorite/api/server";
import { getCurrentSession } from "@/entities/session";
import { FavoritesPage } from "@/views/favorites/ui/favorites-page";

export const dynamic = "force-dynamic";

export default async function FavoritesRoute() {
  const session = await getCurrentSession();

  if (!session) redirect(`${routes.login}?next=${encodeURIComponent(routes.favorites)}`);

  const favorites = await getFavoriteItems(session.user.id);

  return <main className="page-shell"><FavoritesPage initialFavorites={favorites} userId={session.user.id} /></main>;
}
