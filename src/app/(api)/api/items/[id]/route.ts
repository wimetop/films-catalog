import { getItemById } from "@/entities/item";
import { isUuid } from "@/shared/lib/is-uuid";
import { allowRequest, requestRateLimitIdentity } from "@/server/rate-limit/redis-rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  if (!await allowRequest(`item:${requestRateLimitIdentity(request)}`, 120)) return Response.json({ message: "Too many requests" }, { status: 429 });
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
