import { config } from "dotenv";
import Redis from "ioredis";
import { randomUUID } from "node:crypto";

config({ path: ".env.local" });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is not defined; configure a TCP redis:// or rediss:// URL in .env.local");

const connectionOptions = { connectTimeout: 5_000, lazyConnect: true, retryStrategy: () => null };
const connection = new Redis(redisUrl, { ...connectionOptions, maxRetriesPerRequest: 1 });
connection.on("error", () => undefined);

async function verifyCacheWorkerFlow() {
  const suffix = randomUUID();
  const userId = `qa-cache-worker-${suffix}`;
  const itemId = randomUUID();
  const { db, dbClient } = await import("@/db");
  const { items, outboxEvents, user } = await import("@/db/schema");
  const { addFavorite } = await import("@/entities/favorite/api/server");
  const { and, eq, sql } = await import("drizzle-orm");

  await connection.connect();

  try {
    await db.insert(user).values({ id: userId, name: "Cache worker QA", email: `${userId}@example.test` });
    await db.insert(items).values({ id: itemId, title: `Cache worker QA ${suffix}`, description: "Temporary integration item" });
    if (!await addFavorite(userId, itemId)) throw new Error("Favorite was not accepted");

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const score = await connection.zscore("trending:items", itemId);
      const [event] = await db.select({ deliveredAt: outboxEvents.deliveredAt }).from(outboxEvents)
        .where(sql`${outboxEvents.payload}->>'itemId' = ${itemId}`).limit(1);
      if (score === "1" && event?.deliveredAt) {
        console.log("Favorite → outbox → worker recount → Trending verification passed.");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Timed out waiting for outbox delivery and Trending ZSET update");
  } finally {
    await db.delete(outboxEvents).where(sql`${outboxEvents.payload}->>'itemId' = ${itemId}`);
    await db.delete(items).where(eq(items.id, itemId));
    await db.delete(user).where(eq(user.id, userId));
    connection.disconnect();
    await dbClient.end({ timeout: 5 });
  }
}

void verifyCacheWorkerFlow().catch((error) => {
  console.error("Redis and BullMQ connectivity verification failed.", error);
  process.exitCode = 1;
});
