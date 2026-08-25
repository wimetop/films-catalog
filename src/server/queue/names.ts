export const queueNames = {
  catalog: "catalog",
  favorites: "favorites",
  favoritesRecount: "favorites:recount",
  trendingRebuild: "trending:rebuild",
  cacheWarm: "cache:warm",
  outboxPublish: "outbox:publish",
  outboxCleanup: "outbox:cleanup",
  favoritesReconcile: "favorites:reconcile",
  workerLiveness: "worker:liveness",
} as const;

export type CatalogJobName = (typeof queueNames)["trendingRebuild" | "cacheWarm" | "outboxPublish" | "outboxCleanup" | "favoritesReconcile"];
export type FavoritesJobName = (typeof queueNames)["favoritesRecount"];
