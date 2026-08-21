import { cacheStats } from "@/server/cache/stats";

export async function GET() {
  return Response.json(cacheStats.snapshot());
}
