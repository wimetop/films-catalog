import { FavoritesList } from "@/widgets/favorites-list/ui/favorites-list";

type FavoritesPageProps = { userId: string };

export function FavoritesPage({ userId }: FavoritesPageProps) {
  return (
    <section aria-labelledby="favorites-title">
      <div className="section-heading"><div><p className="eyebrow">Ваша добірка</p><h1 id="favorites-title">Обране</h1></div></div>
      <FavoritesList userId={userId} />
    </section>
  );
}
