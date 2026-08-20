type PostgresError = { code?: unknown };

export function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as PostgresError).code === "23503";
}
