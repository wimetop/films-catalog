export const queueNames = {
  catalog: "catalog",
  favoritesRecount: "favorites:recount",
  trendingRebuild: "trending:rebuild",
  cacheWarm: "cache:warm",
  outboxPublish: "outbox:publish",
  outboxCleanup: "outbox:cleanup",
} as const;

export type CatalogJobName = (typeof queueNames)["favoritesRecount" | "trendingRebuild" | "cacheWarm" | "outboxPublish" | "outboxCleanup"];
