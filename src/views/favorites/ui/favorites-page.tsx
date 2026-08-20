import type { Item } from "@/entities/item/model/types";
import { FavoritesList } from "@/widgets/favorites-list/ui/favorites-list";

type FavoritesPageProps = { initialFavorites: Item[]; userId: string };

export function FavoritesPage({ initialFavorites, userId }: FavoritesPageProps) {
  return (
    <section aria-labelledby="favorites-title">
      <div className="section-heading"><div><p className="eyebrow">Ваша добірка</p><h1 id="favorites-title">Обране</h1></div></div>
      <FavoritesList initialFavorites={initialFavorites} userId={userId} />
    </section>
  );
}
