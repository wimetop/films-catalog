import { Queue } from "bullmq";
import { config } from "dotenv";
import Redis from "ioredis";

config({ path: ".env.local" });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is not defined; configure a TCP redis:// or rediss:// URL in .env.local");

const connectionOptions = { connectTimeout: 5_000, lazyConnect: true, retryStrategy: () => null };
const connection = new Redis(redisUrl, { ...connectionOptions, maxRetriesPerRequest: 1 });
const bullConnection = new Redis(redisUrl, { ...connectionOptions, maxRetriesPerRequest: null });
connection.on("error", () => undefined);
bullConnection.on("error", () => undefined);
const queue = new Queue("qa-cache-worker", { connection: bullConnection });

async function verifyCacheWorkerFlow() {
  const key = `qa:cache-worker:${randomUUID()}`;
  await connection.connect();
  const job = await queue.add("qa:connectivity", { key }, { removeOnComplete: true, removeOnFail: true });

  try {
    await connection.set(key, "ok", "EX", 30);
    if (await connection.get(key) !== "ok") throw new Error("Redis read/write verification failed");
    if (!job.id) throw new Error("BullMQ did not create a job");
    console.log("Redis and BullMQ connectivity verification passed.");
  } finally {
    await connection.del(key);
    if (job.id) await queue.remove(job.id);
    await queue.close();
    connection.disconnect();
    bullConnection.disconnect();
  }
}

void verifyCacheWorkerFlow().catch((error) => {
  console.error("Redis and BullMQ connectivity verification failed.", error);
  process.exitCode = 1;
});
import { randomUUID } from "node:crypto";
