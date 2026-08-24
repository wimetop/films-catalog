import { getItemById } from "@/entities/item/api/server";
import { isUuid } from "@/shared/lib/is-uuid";
import { allowRequest, requestRateLimitIdentity } from "@/server/rate-limit/redis-rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const identity = requestRateLimitIdentity(request);
  if (identity && !await allowRequest(`item:${identity}`, 120)) return Response.json({ message: "Too many requests" }, { status: 429 });
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
