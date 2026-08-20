export const favoriteKeys = {
  all: (userId: string) => ["favorites", userId] as const,
};
