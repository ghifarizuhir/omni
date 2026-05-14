import { Router } from 'express';
import type { Integration } from '../../src/types/integration';
import { integrationsRepo } from '../repositories/docs';
import { prisma } from '../db';
import { audit } from '../audit';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, required } from '../util';

export const integrationsRouter = Router();

integrationsRouter.get('/integrations', requirePermission('integration.read'), asyncHandler(async (req, res) => {
  const list = await integrationsRepo.list(req.tenantId);
  const domain = typeof req.query.domain === 'string' ? req.query.domain : undefined;
  if (domain) {
    res.json(list.filter(i => i.enabled && i.domains.includes(domain as Integration['domains'][number])));
    return;
  }
  res.json(list);
}));

integrationsRouter.get('/integrations/stats', requirePermission('integration.read'), asyncHandler(async (req, res) => {
  const items = await integrationsRepo.list(req.tenantId);
  const enabled = items.filter(i => i.enabled);
  res.json({
    total: items.length,
    enabled: enabled.length,
    healthy: enabled.filter(i => i.status === 'healthy').length,
    needsAttention: enabled.filter(i => i.status === 'error' || i.status === 'degraded').length,
    events24h: enabled.reduce((sum, i) => sum + i.eventCount24h, 0),
    webhookCount: items.filter(i => i.mode === 'webhook').length,
    apiCount: items.filter(i => i.mode === 'api').length,
  });
}));

integrationsRouter.get('/integrations/:id', requirePermission('integration.read'), asyncHandler(async (req, res) => {
  res.json(required(await integrationsRepo.get(req.tenantId, req.params.id), 'Integration'));
}));

integrationsRouter.post('/integrations', requirePermission('integration.write'), asyncHandler(async (req, res) => {
  const body = req.body as Integration;
  const created = await prisma.integration.create({
    data: {
      id: body.id, tenantId: req.tenantId,
      enabled: body.enabled, status: body.status, data: JSON.stringify(body),
    },
  });
  await audit(req, { action: 'integration.create', resourceKind: 'Integration', resourceId: created.id, after: body });
  res.status(201).json(body);
}));

integrationsRouter.patch('/integrations/:id', requirePermission('integration.write'), asyncHandler(async (req, res) => {
  const existing = await integrationsRepo.get(req.tenantId, req.params.id);
  if (!existing) throw Object.assign(new Error('Integration not found'), { status: 404 });
  const patch = req.body as Partial<Integration>;
  const next: Integration = { ...existing, ...patch };
  await prisma.integration.update({
    where: { id: req.params.id },
    data: { enabled: next.enabled, status: next.status, data: JSON.stringify(next) },
  });
  await audit(req, { action: 'integration.update', resourceKind: 'Integration', resourceId: req.params.id, before: existing, after: next });
  res.json(next);
}));

integrationsRouter.delete('/integrations/:id', requirePermission('integration.write'), asyncHandler(async (req, res) => {
  await prisma.integration.deleteMany({ where: { tenantId: req.tenantId, id: req.params.id } });
  await audit(req, { action: 'integration.delete', resourceKind: 'Integration', resourceId: req.params.id });
  res.status(204).end();
}));
