import type { ConfigurationItem, CIRelationship, CIAuditEntry } from '../types';
import type { MockService } from '../mocks/services';
import { apiFetch } from './core';

export const cisService = {
  list: () => apiFetch<ConfigurationItem[]>('/cis'),
  get: (publicId: string) => apiFetch<ConfigurationItem>(`/cis/${publicId}`),
  relationships: (ciId: string) => apiFetch<CIRelationship[]>(`/cis/${ciId}/relationships`),
  relationshipsAll: () => apiFetch<CIRelationship[]>('/cis/relationships'),
  audit: (ciId?: string) => apiFetch<CIAuditEntry[]>('/cis/audit', { query: { ciId } }),
};

export const servicesService = {
  list: () => apiFetch<MockService[]>('/services'),
  get: (id: string) => apiFetch<MockService>(`/services/${id}`),
};
