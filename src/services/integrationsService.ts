import { mockIntegrations, integrationWebhookUrl } from '../mocks/integrations';
import type { Integration, IntegrationDomain } from '../types/integration';
import { apiFetch, isLive, mockRequired, mockResult } from './core';

// In-memory store backing the mock implementation. Mutations update this
// array so the UI behaves like a real backend during development.
let store: Integration[] = [...mockIntegrations];

export interface IntegrationStats {
  total: number;
  enabled: number;
  healthy: number;
  needsAttention: number;
  events24h: number;
  webhookCount: number;
  apiCount: number;
}

const computeStats = (items: Integration[]): IntegrationStats => {
  const enabled = items.filter(i => i.enabled);
  return {
    total: items.length,
    enabled: enabled.length,
    healthy: enabled.filter(i => i.status === 'healthy').length,
    needsAttention: enabled.filter(i => i.status === 'error' || i.status === 'degraded').length,
    events24h: enabled.reduce((sum, i) => sum + i.eventCount24h, 0),
    webhookCount: items.filter(i => i.mode === 'webhook').length,
    apiCount: items.filter(i => i.mode === 'api').length,
  };
};

export const integrationsService = {
  list(): Promise<Integration[]> {
    if (isLive()) return apiFetch<Integration[]>('/integrations');
    return mockResult([...store]);
  },

  listByDomain(domain: IntegrationDomain): Promise<Integration[]> {
    if (isLive()) return apiFetch<Integration[]>('/integrations', { query: { domain } });
    return mockResult(store.filter(i => i.enabled && i.domains.includes(domain)));
  },

  get(id: string): Promise<Integration> {
    if (isLive()) return apiFetch<Integration>(`/integrations/${id}`);
    return mockRequired(store.find(i => i.id === id), 'Integration');
  },

  stats(): Promise<IntegrationStats> {
    if (isLive()) return apiFetch<IntegrationStats>('/integrations/stats');
    return mockResult(computeStats(store));
  },

  create(input: Integration): Promise<Integration> {
    if (isLive()) return apiFetch<Integration>('/integrations', { method: 'POST', body: input });
    store = [input, ...store];
    return mockResult(input);
  },

  update(id: string, patch: Partial<Integration>): Promise<Integration> {
    if (isLive()) return apiFetch<Integration>(`/integrations/${id}`, { method: 'PATCH', body: patch });
    let updated: Integration | undefined;
    store = store.map(i => {
      if (i.id !== id) return i;
      updated = { ...i, ...patch };
      return updated;
    });
    return mockRequired(updated, 'Integration');
  },

  toggle(id: string): Promise<Integration> {
    const current = store.find(i => i.id === id);
    if (!current) return mockRequired(undefined as unknown as Integration, 'Integration');
    return integrationsService.update(id, {
      enabled: !current.enabled,
      status: !current.enabled ? 'pending' : current.status,
    });
  },

  rotateSecret(id: string): Promise<Integration> {
    const newSecret = `whk_${Math.random().toString(36).slice(2, 30)}_${Math.random().toString(36).slice(2, 5)}`;
    return integrationsService.update(id, { webhookSecret: newSecret });
  },

  remove(id: string): Promise<void> {
    if (isLive()) return apiFetch<void>(`/integrations/${id}`, { method: 'DELETE' });
    store = store.filter(i => i.id !== id);
    return mockResult(undefined);
  },

  webhookUrl(path: string): string {
    return integrationWebhookUrl(path);
  },
};
