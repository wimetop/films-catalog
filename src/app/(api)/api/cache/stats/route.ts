import { cacheStats } from "@/server/cache/stats";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  return Response.json(cacheStats.snapshot());
}
