export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export type Pagination = { limit: number; offset: number };

export const parsePagination = (q: Record<string, unknown>): Pagination => {
  const rawPage = q.page !== undefined ? Number(q.page) : NaN;
  const rawPageSize = q.pageSize !== undefined ? Number(q.pageSize) : NaN;
  if (Number.isFinite(rawPage) || Number.isFinite(rawPageSize)) {
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const pageSizeRaw = Number.isFinite(rawPageSize) ? rawPageSize : DEFAULT_PAGE_SIZE;
    const limit = Math.min(Math.max(1, Math.floor(pageSizeRaw)), MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;
    return { limit, offset };
  }
  const rawLimit = Number(q.limit ?? q.take ?? q.pageSize ?? DEFAULT_PAGE_SIZE);
  const rawOffset = Number(q.offset ?? q.skip ?? 0);
  const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);
  return { limit, offset };
};

export const buildPaginationMeta = (total: number, { limit, offset }: Pagination) => ({
  total,
  limit,
  offset,
  hasMore: offset + limit < total,
});
