import type { ConfigurationItem, CIRelationship, CIAuditEntry, Service } from '../types';
import { apiFetch } from './core';
import type { CreateCIInput, UpdateCIInput } from '../shared/schemas/ci';

export type { CreateCIInput, UpdateCIInput } from '../shared/schemas/ci';
export { createCISchema, updateCISchema } from '../shared/schemas/ci';
export type { Service } from '../types';

export interface CmdbPaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  health?: string;
}

export const cisService = {
  create: (input: CreateCIInput) => apiFetch<ConfigurationItem>('/cis', { method: 'POST', body: input }),
  list: (params?: CmdbPaginationParams) =>
    apiFetch<ConfigurationItem[]>('/cis', params ? { query: params as Record<string, string | number | boolean | undefined> } : undefined),
  get: (publicId: string) => apiFetch<ConfigurationItem>(`/cis/${publicId}`),
  relationships: (ciId: string) => apiFetch<CIRelationship[]>(`/cis/${ciId}/relationships`),
  relationshipsAll: () => apiFetch<CIRelationship[]>('/cis/relationships'),
  audit: (ciId?: string) => apiFetch<CIAuditEntry[]>('/cis/audit', { query: { ciId } }),

  // M6.11 (B1.3) — Partial update of a CI. The CMDB detail page's Save handler
  // optimistically applies the patch locally, then calls this; failure reverts.
  update: (publicId: string, patch: UpdateCIInput) =>
    apiFetch<ConfigurationItem>(`/cis/${publicId}`, { method: 'PATCH', body: patch }),
};

// Alias for batch1 test + FE modals (cmdbService === cisService)
export const cmdbService = cisService;

export const servicesService = {
  list: (params?: CmdbPaginationParams) =>
    apiFetch<Service[]>('/services', params ? { query: params as Record<string, string | number | boolean | undefined> } : undefined),
  get: (id: string) => apiFetch<Service>(`/services/${id}`),
};
