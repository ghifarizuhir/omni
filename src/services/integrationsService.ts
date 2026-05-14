import type { Integration, IntegrationDomain } from '../types/integration';
import { integrationWebhookUrl } from '../mocks/integrations';
import { apiFetch } from './core';

export interface IntegrationStats {
  total: number;
  enabled: number;
  healthy: number;
  needsAttention: number;
  events24h: number;
  webhookCount: number;
  apiCount: number;
}

export const integrationsService = {
  list: () => apiFetch<Integration[]>('/integrations'),
  listByDomain: (domain: IntegrationDomain) =>
    apiFetch<Integration[]>('/integrations', { query: { domain } }),
  get: (id: string) => apiFetch<Integration>(`/integrations/${id}`),
  stats: () => apiFetch<IntegrationStats>('/integrations/stats'),

  create: (input: Integration) =>
    apiFetch<Integration>('/integrations', { method: 'POST', body: input }),
  update: (id: string, patch: Partial<Integration>) =>
    apiFetch<Integration>(`/integrations/${id}`, { method: 'PATCH', body: patch }),
  remove: (id: string) =>
    apiFetch<void>(`/integrations/${id}`, { method: 'DELETE' }),

  async toggle(id: string): Promise<Integration> {
    const current = await integrationsService.get(id);
    return integrationsService.update(id, {
      enabled: !current.enabled,
      status: !current.enabled ? 'pending' : current.status,
    });
  },
  rotateSecret(id: string): Promise<Integration> {
    const newSecret = `whk_${Math.random().toString(36).slice(2, 30)}_${Math.random().toString(36).slice(2, 5)}`;
    return integrationsService.update(id, { webhookSecret: newSecret });
  },

  webhookUrl(path: string): string {
    return integrationWebhookUrl(path);
  },
};
