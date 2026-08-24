import { getTrendingItems } from "@/entities/trending/api/server";
import { allowRequest, requestRateLimitIdentity } from "@/server/rate-limit/redis-rate-limit";

export async function GET(request: Request) {
  const identity = requestRateLimitIdentity(request);
  if (identity && !await allowRequest(`trending:${identity}`, 120)) return Response.json({ message: "Too many requests" }, { status: 429 });
  return Response.json(await getTrendingItems());
}
