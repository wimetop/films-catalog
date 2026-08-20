import { getItemById } from "@/entities/item";
import { isUuid } from "@/shared/lib/is-uuid";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!isUuid(id)) {
    return Response.json({ message: "Item not found" }, { status: 404 });
  }

  const item = await getItemById(id);

  if (!item) {
    return Response.json({ message: "Item not found" }, { status: 404 });
  }

  return Response.json(item);
}
