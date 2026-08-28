import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/services/core', () => ({ apiFetch: vi.fn(async () => []) }));
import { problemsService } from '../../src/services/itsmServices';
import { apiFetch } from '../../src/services/core';
describe('problemsService pagination', () => {
  it('passes page & pageSize as query', async () => {
    await problemsService.list({ page: 2, pageSize: 20 });
    expect(apiFetch).toHaveBeenCalledWith('/problems', expect.objectContaining({ query: expect.objectContaining({ page: 2, pageSize: 20 }) }));
  });
  it('list without args still works', async () => {
    await problemsService.list();
    expect(apiFetch).toHaveBeenCalled();
  });
});
