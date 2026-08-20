import type { Item } from "@/entities/item/model/types";
import { ItemDetails } from "@/entities/item/ui/item-details";

type ItemDetailsPageProps = { initialItem: Item; initialFavorites: Item[]; userId: string | null };

export function ItemDetailsPage({ initialItem, initialFavorites, userId }: ItemDetailsPageProps) {
  return <ItemDetails initialItem={initialItem} initialFavorites={initialFavorites} userId={userId} />;
}
