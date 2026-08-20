export const itemKeys = {
  all: ["items"] as const,
  detail: (id: string) => ["items", id] as const,
};
