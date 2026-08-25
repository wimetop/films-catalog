type RedisSetter = {
  set(key: string, value: string, mode: "EX", seconds: number): Promise<unknown>;
};

export function createWorkerHeartbeat(redis: RedisSetter, key: string, ttlSeconds = 30) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastProcessedAt = Date.now();

  const refresh = () => {
    lastProcessedAt = Date.now();
    return redis.set(key, String(lastProcessedAt), "EX", ttlSeconds);
  };

  return {
    refresh,
    afterJob: refresh,
    start(probe: () => Promise<void>, onStale: () => void) {
      timer ??= setInterval(() => {
        if (Date.now() - lastProcessedAt >= ttlSeconds * 1_000) {
          onStale();
          return;
        }
        void probe().catch((error) => {
          console.error("Worker liveness probe enqueue failed", { message: error instanceof Error ? error.message : String(error) });
        });
      }, Math.floor((ttlSeconds * 1_000) / 3));
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
}
