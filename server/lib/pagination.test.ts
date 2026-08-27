import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginationMeta, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './pagination.js';

describe('parsePagination', () => {
  it('defaults to 50/0', () => {
    expect(parsePagination({})).toEqual({ limit: 50, offset: 0 });
  });
  it('clamps max', () => {
    expect(parsePagination({ limit: '999' }).limit).toBe(MAX_PAGE_SIZE);
  });
  it('parses offset', () => {
    expect(parsePagination({ limit: '10', offset: '20' })).toEqual({ limit: 10, offset: 20 });
  });
  it('handles take/skip aliases', () => {
    expect(parsePagination({ take: '5', skip: '10' })).toEqual({ limit: 5, offset: 10 });
  });
  it('ignores NaN', () => {
    expect(parsePagination({ limit: 'abc', offset: 'xyz' })).toEqual({ limit: DEFAULT_PAGE_SIZE, offset: 0 });
  });
});

describe('buildPaginationMeta', () => {
  it('computes hasMore', () => {
    expect(buildPaginationMeta(100, { limit: 50, offset: 0 })).toEqual({ total: 100, limit: 50, offset: 0, hasMore: true });
    expect(buildPaginationMeta(100, { limit: 50, offset: 50 })).toEqual({ total: 100, limit: 50, offset: 50, hasMore: false });
  });
});
