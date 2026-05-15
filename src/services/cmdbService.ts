import type { ConfigurationItem, CIRelationship, CIAuditEntry, ServiceHealthStatus } from '../types';
import { apiFetch } from './core';
import type { UpdateCIInput } from '../shared/schemas/ci';

export type { UpdateCIInput } from '../shared/schemas/ci';
export { updateCISchema } from '../shared/schemas/ci';

export interface Service {
  id: string;
  name: string;
  tier: 'critical' | 'important' | 'standard';
  ownerId: string;
  ownerTeamId: string;
  slaTarget: number;
  currentHealth: ServiceHealthStatus;
  uptime30d: number;
}

export const cisService = {
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

export const servicesService = {
  list: () => apiFetch<Service[]>('/services'),
  get: (id: string) => apiFetch<Service>(`/services/${id}`),
};
