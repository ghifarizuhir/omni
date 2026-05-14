import { Router } from 'express';
import { monitoringRepo } from '../repositories/events';
import { audit } from '../audit';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, required } from '../util';
import { createAlertRouteSchema, updateAlertRouteSchema } from '../../src/shared/schemas/alertRoute';

export const monitoringRouter = Router();

monitoringRouter.get('/monitoring/rules', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  res.json(await monitoringRepo.listRules(req.tenantId));
}));
monitoringRouter.get('/monitoring/rules/:publicId', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  res.json(required(await monitoringRepo.getRule(req.tenantId, req.params.publicId), 'MonitoringRule'));
}));
monitoringRouter.get('/monitoring/routes', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  res.json(await monitoringRepo.listRoutes(req.tenantId));
}));
monitoringRouter.get('/monitoring/routes/:publicId', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  res.json(required(await monitoringRepo.getRoute(req.tenantId, req.params.publicId), 'AlertRoute'));
}));

// ── Alert route writes (M6.11 B1.1) ──────────────────────────────────────────
// Mounted at `/monitoring/routes` to match the existing GET paths; the task
// spec wrote `/monitoring/alert-routes` but the GET surface is already
// `/monitoring/routes` so we follow the existing convention.

monitoringRouter.post(
  '/monitoring/routes',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const body = createAlertRouteSchema.parse(req.body);
    const route = await monitoringRepo.createRoute(req.tenantId, body as Parameters<typeof monitoringRepo.createRoute>[1]);
    await audit(req, {
      action: 'create',
      resourceKind: 'AlertRoute',
      resourceId: route.id,
      after: route,
    });
    res.status(201).json(route);
  }),
);

monitoringRouter.patch(
  '/monitoring/routes/:publicId',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const body = updateAlertRouteSchema.parse(req.body);
    const result = await monitoringRepo.updateRoute(req.tenantId, req.params.publicId, body as Parameters<typeof monitoringRepo.updateRoute>[2]);
    if (!result) throw new HttpError(404, 'AlertRoute not found');
    await audit(req, {
      action: 'update',
      resourceKind: 'AlertRoute',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);

monitoringRouter.delete(
  '/monitoring/routes/:publicId',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const result = await monitoringRepo.deleteRoute(req.tenantId, req.params.publicId);
    if (!result) throw new HttpError(404, 'AlertRoute not found');
    await audit(req, {
      action: 'delete',
      resourceKind: 'AlertRoute',
      resourceId: result.internalId,
      before: result.before,
    });
    res.status(204).end();
  }),
);
