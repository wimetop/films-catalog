import { getTrendingItems } from "@/entities/trending/api/server";

export async function GET() {
  return Response.json(await getTrendingItems());
}
