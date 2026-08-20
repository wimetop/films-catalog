import { getFavoriteItems } from "@/entities/favorite/api/server";
import { getItems } from "@/entities/item";
import { getCurrentSession } from "@/entities/session";
import { CatalogPage } from "@/views/catalog/ui/catalog-page";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const [items, session] = await Promise.all([getItems(), getCurrentSession()]);
  const favorites = session ? await getFavoriteItems(session.user.id) : [];

  return <main className="page-shell"><CatalogPage initialItems={items} initialFavorites={favorites} userId={session?.user.id ?? null} /></main>;
}
