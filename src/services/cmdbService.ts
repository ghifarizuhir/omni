import type { ConfigurationItem, CIRelationship, CIAuditEntry, Service } from '../types';
import { apiFetch } from './core';
import type { CreateCIInput, UpdateCIInput } from '../shared/schemas/ci';

export type { CreateCIInput, UpdateCIInput } from '../shared/schemas/ci';
export { createCISchema, updateCISchema } from '../shared/schemas/ci';
export type { Service } from '../types';

export const cisService = {
  create: (input: CreateCIInput) => apiFetch<ConfigurationItem>('/cis', { method: 'POST', body: input }),
  list: () => apiFetch<ConfigurationItem[]>('/cis'),
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
  list: () => apiFetch<Service[]>('/services'),
  get: (id: string) => apiFetch<Service>(`/services/${id}`),
};
