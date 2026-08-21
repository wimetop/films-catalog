import { ItemsCatalog } from "@/widgets/items-catalog/ui/items-catalog";

type CatalogPageProps = { userId: string | null };

export function CatalogPage({ userId }: CatalogPageProps) {
  return <ItemsCatalog userId={userId} />;
}
