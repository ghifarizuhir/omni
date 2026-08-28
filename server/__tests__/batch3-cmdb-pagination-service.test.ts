import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/services/core', () => ({ apiFetch: vi.fn(async () => []) }));
import { cisService } from '../../src/services/cmdbService';
import { knowledgeService } from '../../src/services/platformServices';
import { apiFetch } from '../../src/services/core';
describe('cmdb/kb pagination', () => {
  it('cisService.list passes query', async () => {
    await cisService.list({ page: 1, pageSize: 50, search: 'db' } as any);
    expect(apiFetch).toHaveBeenCalledWith('/cis', expect.objectContaining({ query: expect.objectContaining({ search: 'db' }) }));
  });
  it('knowledgeService articles passes q', async () => {
    await knowledgeService.articles({ q: 'postgres' } as any);
    expect(apiFetch).toHaveBeenCalledWith('/kb/articles', expect.objectContaining({ query: expect.objectContaining({ q: 'postgres' }) }));
  });
});
