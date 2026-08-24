const retryDelaysMilliseconds = [2_000, 5_000] as const;

/** Retries an active trending query long enough for the outbox projection to catch up. */
export function scheduleTrendingRefresh(refresh: () => void): () => void {
  const timers = retryDelaysMilliseconds.map((delay) => setTimeout(refresh, delay));

  return () => timers.forEach(clearTimeout);
}
