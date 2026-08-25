import { z } from "zod";

const serverEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  CACHE_TTL_ITEM: z.coerce.number().int().positive().default(300),
  CACHE_TTL_LIST: z.coerce.number().int().positive().default(60),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  REDIS_URL: z.url(),
  TRENDING_REBUILD_CRON: z.string().min(1).default("*/5 * * * *"),
  TRENDING_TOP_N: z.coerce.number().int().positive().default(10),
});

function parseServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment: ${message}`);
  }

  return parsed.data;
}

const parsedEnv = parseServerEnv();

export const envServer = {
  databaseUrl: parsedEnv.DATABASE_URL,
  directUrl: parsedEnv.DIRECT_URL,
  betterAuthSecret: parsedEnv.BETTER_AUTH_SECRET,
  betterAuthUrl: parsedEnv.BETTER_AUTH_URL,
  redisUrl: parsedEnv.REDIS_URL,
  cacheTtlList: parsedEnv.CACHE_TTL_LIST,
  cacheTtlItem: parsedEnv.CACHE_TTL_ITEM,
  trendingTopN: parsedEnv.TRENDING_TOP_N,
  trendingRebuildCron: parsedEnv.TRENDING_REBUILD_CRON,
} as const;
