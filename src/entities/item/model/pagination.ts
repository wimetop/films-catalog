const allowedPageSizes = [20, 50, 100] as const;
const maximumPage = 1_000;

function positiveSafeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value: string | null): number {
  const requested = positiveSafeInteger(value, allowedPageSizes[0]);

  return (
    allowedPageSizes.find((pageSize) => requested <= pageSize) ??
    allowedPageSizes.at(-1)!
  );
}

export function normalizeCatalogPagination(
  pageValue: string | null,
  pageSizeValue: string | null,
): { page: number; pageSize: number } {
  return {
    page: Math.min(positiveSafeInteger(pageValue, 1), maximumPage),
    pageSize: normalizePageSize(pageSizeValue),
  };
}
