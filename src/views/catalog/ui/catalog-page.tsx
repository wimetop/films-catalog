import { ItemsCatalog } from "@/widgets/items-catalog/ui/items-catalog";
import { TrendingList } from "@/widgets/trending/ui/trending-list";

type CatalogPageProps = { userId: string | null };

export function CatalogPage({ userId }: CatalogPageProps) {
  return <><TrendingList /><ItemsCatalog userId={userId} /></>;
}
