import { dbClient } from "@/db";
import { withRedisTimeout } from "@/server/cache/cache-aside";
import { redis } from "@/server/cache/client";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const databaseClient = dbClient as typeof dbClient & {
    execute?: (query: string) => Promise<unknown>;
  };
  const [databaseResult, redisResult] = await Promise.allSettled([
    databaseClient.execute?.("select 1") ?? dbClient.unsafe("select 1"),
    withRedisTimeout(redis.ping()),
  ]);

  const database = databaseResult.status === "fulfilled" ? "ok" : "down";
  const redisStatus = redisResult.status === "fulfilled" ? "ok" : "down";
  const healthy = database === "ok";
  const status = healthy && redisStatus === "ok" ? "ok" : healthy ? "degraded" : "down";

  return Response.json(
    { status, database, redis: redisStatus },
    { status: healthy ? 200 : 503 },
  );
}
