import type { Item } from "@/entities/item/model/types";
import { ItemsCatalog } from "@/widgets/items-catalog/ui/items-catalog";

type CatalogPageProps = { initialItems: Item[]; initialFavorites: Item[]; userId: string | null };

export function CatalogPage({ initialItems, initialFavorites, userId }: CatalogPageProps) {
  return <ItemsCatalog initialItems={initialItems} initialFavorites={initialFavorites} userId={userId} />;
}
