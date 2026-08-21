import type { Item } from "@/entities/item/model/types";
import { ItemDetails } from "@/entities/item/ui/item-details";

type ItemDetailsPageProps = { item: Item; userId: string | null };

export function ItemDetailsPage({ item, userId }: ItemDetailsPageProps) {
  return <ItemDetails item={item} userId={userId} />;
}
