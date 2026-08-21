export const favoriteKeys = {
  ids: (userId: string) => ["favorites", userId, "ids"] as const,
  list: (userId: string) => ["favorites", userId, "list"] as const,
};
