const prefix = "cat:v1";

export const cacheKeys = {
  catalogVersion: () => `${prefix}:items:version`,
  itemsList: (page: number, pageSize: number, version = "1") => `${prefix}:items:list:v${version}:${page}:${pageSize}`,
  item: (itemId: string) => `${prefix}:item:${itemId}`,
  trendingTop: () => `${prefix}:trending:top`,
  trendingItems: () => "trending:items",
  lock: (key: string) => `lock:${key}`,
} as const;
