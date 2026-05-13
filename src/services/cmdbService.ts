import { mockCIs } from '../mocks/cis';
import { mockCIRelationships } from '../mocks/ciRelationships';
import { mockCIAuditEntries } from '../mocks/ciAudit';
import { mockServices, type MockService } from '../mocks/services';
import type { ConfigurationItem, CIRelationship, CIAuditEntry } from '../types';
import { apiFetch, isLive, mockRequired, mockResult } from './core';

export const cisService = {
  list(): Promise<ConfigurationItem[]> {
    if (isLive()) return apiFetch<ConfigurationItem[]>('/cis');
    return mockResult(mockCIs);
  },
  get(publicId: string): Promise<ConfigurationItem> {
    if (isLive()) return apiFetch<ConfigurationItem>(`/cis/${publicId}`);
    return mockRequired(mockCIs.find(c => c.publicId === publicId), 'CI');
  },
  relationships(ciId: string): Promise<CIRelationship[]> {
    if (isLive()) return apiFetch<CIRelationship[]>(`/cis/${ciId}/relationships`);
    return mockResult(mockCIRelationships.filter(r => r.fromCiId === ciId || r.toCiId === ciId));
  },
  relationshipsAll(): Promise<CIRelationship[]> {
    if (isLive()) return apiFetch<CIRelationship[]>('/cis/relationships');
    return mockResult(mockCIRelationships);
  },
  audit(ciId?: string): Promise<CIAuditEntry[]> {
    if (isLive()) return apiFetch<CIAuditEntry[]>('/cis/audit', { query: { ciId } });
    return mockResult(ciId ? mockCIAuditEntries.filter(a => a.ciId === ciId) : mockCIAuditEntries);
  },
};

export const servicesService = {
  list(): Promise<MockService[]> {
    if (isLive()) return apiFetch<MockService[]>('/services');
    return mockResult(mockServices);
  },
  get(id: string): Promise<MockService> {
    if (isLive()) return apiFetch<MockService>(`/services/${id}`);
    return mockRequired(mockServices.find(s => s.id === id), 'Service');
  },
};
