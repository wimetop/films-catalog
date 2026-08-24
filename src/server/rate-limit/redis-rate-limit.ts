import { redis } from "@/server/cache/client";
import { withRedisTimeout } from "@/server/cache/cache-aside";

export { requestRateLimitIdentity } from "./request-identity";

const script = "local n=redis.call('incr',KEYS[1]); if n==1 then redis.call('expire',KEYS[1],ARGV[1]) end; return n";

export async function allowRequest(bucket: string, limit = 60, windowSeconds = 60): Promise<boolean> {
  try {
    const count = await withRedisTimeout(redis.eval(script, 1, `rate:${bucket}`, String(windowSeconds)));
    return Number(count) <= limit;
  } catch {
    return true;
  }
}
