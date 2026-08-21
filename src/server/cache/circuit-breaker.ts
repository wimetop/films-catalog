let openUntil = 0;

export function canUseRedis(): boolean {
  return Date.now() >= openUntil;
}

export function markRedisUnavailable(cooldownMs = 10_000): void {
  openUntil = Math.max(openUntil, Date.now() + cooldownMs);
}

export function resetRedisCircuitForTests(): void {
  openUntil = 0;
}
