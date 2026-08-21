export type CacheMetric = "itemsList" | "itemDetails";
export type CacheOutcome = "hit" | "miss";

type Counter = { hits: number; misses: number };
type CacheStatsSnapshot = Record<CacheMetric, Counter & { ratio: number }>;

export function createCacheStats() {
  const counters: Record<CacheMetric, Counter> = {
    itemsList: { hits: 0, misses: 0 },
    itemDetails: { hits: 0, misses: 0 },
  };

  return {
    record(metric: CacheMetric, outcome: CacheOutcome): void {
      counters[metric][outcome === "hit" ? "hits" : "misses"] += 1;
    },
    snapshot(): CacheStatsSnapshot {
      return Object.fromEntries(
        Object.entries(counters).map(([metric, counter]) => {
          const total = counter.hits + counter.misses;
          return [metric, { ...counter, ratio: total === 0 ? 0 : counter.hits / total }];
        }),
      ) as CacheStatsSnapshot;
    },
  };
}

export const cacheStats = createCacheStats();
