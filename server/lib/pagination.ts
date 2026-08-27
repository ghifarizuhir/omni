export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export type Pagination = { limit: number; offset: number };

export const parsePagination = (q: Record<string, unknown>): Pagination => {
  const rawLimit = Number(q.limit ?? q.take ?? DEFAULT_PAGE_SIZE);
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
