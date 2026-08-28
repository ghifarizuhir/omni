import { Router, type Request } from 'express';
import { monitoringRepo } from '../repositories/events';
import { audit } from '../audit';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, required } from '../util';
import { parsePagination } from '../lib/pagination';
import { createAlertRouteSchema, updateAlertRouteSchema } from '../../src/shared/schemas/alertRoute';
import {
  createMonitoringRuleSchema,
  updateMonitoringRuleSchema,
} from '../../src/shared/schemas/monitoringRule';

export const monitoringRouter = Router();

/** Convenience accessor — `req.scoped` is attached by withScopedDb middleware. */
function scoped(req: Request) {
  if (!req.scoped) throw new HttpError(500, 'scope not initialized');
  return req.scoped;
}

monitoringRouter.get('/monitoring/rules', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).monitoring.listRules(pagination));
}));
monitoringRouter.get('/monitoring/rules/:publicId', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).monitoring.getRule(req.params.publicId), 'MonitoringRule'));
}));
monitoringRouter.get('/monitoring/routes', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).monitoring.listRoutes(pagination));
}));
monitoringRouter.get('/monitoring/routes/:publicId', requirePermission('rule.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).monitoring.getRoute(req.params.publicId), 'AlertRoute'));
}));

// ── Alert route writes (M6.11 B1.1) ──────────────────────────────────────────
// ScopeViolationError propagates to the global error handler → 403.

monitoringRouter.post(
  '/monitoring/routes',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const body = createAlertRouteSchema.parse(req.body);
    const wrapped = await scoped(req).monitoring.createRoute(body as Parameters<typeof monitoringRepo.createRoute>[1]);
    await audit(req, {
      action: 'create',
      resourceKind: 'AlertRoute',
      resourceId: wrapped.result.id,
      after: wrapped.result,
      scopeMode: wrapped.scopeMode,
    });
    res.status(201).json(wrapped.result);
  }),
);

monitoringRouter.patch(
  '/monitoring/routes/:publicId',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const body = updateAlertRouteSchema.parse(req.body);
    const wrapped = await scoped(req).monitoring.updateRoute(req.params.publicId, body as Parameters<typeof monitoringRepo.updateRoute>[2]);
    if (!wrapped) throw new HttpError(404, 'AlertRoute not found');
    await audit(req, {
      action: 'update',
      resourceKind: 'AlertRoute',
      resourceId: wrapped.result!.internalId,
      before: wrapped.result!.before,
      after: wrapped.result!.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result!.after);
  }),
);

monitoringRouter.delete(
  '/monitoring/routes/:publicId',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const wrapped = await scoped(req).monitoring.deleteRoute(req.params.publicId);
    if (!wrapped) throw new HttpError(404, 'AlertRoute not found');
    await audit(req, {
      action: 'delete',
      resourceKind: 'AlertRoute',
      resourceId: wrapped.result!.internalId,
      before: wrapped.result!.before,
      scopeMode: wrapped.scopeMode,
    });
    res.status(204).end();
  }),
);

// ── Monitoring rule writes (M6.11 B7) ────────────────────────────────────────

monitoringRouter.post(
  '/monitoring/rules',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const body = createMonitoringRuleSchema.parse(req.body);
    let wrapped;
    try {
      wrapped = await scoped(req).monitoring.createRule(body as Parameters<typeof monitoringRepo.createRule>[1], { id: req.session.userId });
    } catch (inner) {
      if (inner instanceof Error && inner.message === 'ALERT_ROUTE_NOT_FOUND') {
        throw new HttpError(400, 'Alert route not found');
      }
      throw inner;
    }
    await audit(req, {
      action: 'create',
      resourceKind: 'MonitoringRule',
      resourceId: wrapped.result.id,
      after: wrapped.result,
      scopeMode: wrapped.scopeMode,
    });
    res.status(201).json(wrapped.result);
  }),
);

monitoringRouter.patch(
  '/monitoring/rules/:publicId',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const body = updateMonitoringRuleSchema.parse(req.body);
    let wrapped;
    try {
      wrapped = await scoped(req).monitoring.updateRule(req.params.publicId, body as Parameters<typeof monitoringRepo.updateRule>[2]);
    } catch (inner) {
      if (inner instanceof Error && inner.message === 'ALERT_ROUTE_NOT_FOUND') {
        throw new HttpError(400, 'Alert route not found');
      }
      throw inner;
    }
    if (!wrapped) throw new HttpError(404, 'MonitoringRule not found');
    await audit(req, {
      action: 'update',
      resourceKind: 'MonitoringRule',
      resourceId: wrapped.result!.internalId,
      before: wrapped.result!.before,
      after: wrapped.result!.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result!.after);
  }),
);

monitoringRouter.delete(
  '/monitoring/rules/:publicId',
  requirePermission('rule.write'),
  asyncHandler(async (req, res) => {
    const wrapped = await scoped(req).monitoring.deleteRule(req.params.publicId);
    if (!wrapped) throw new HttpError(404, 'MonitoringRule not found');
    await audit(req, {
      action: 'delete',
      resourceKind: 'MonitoringRule',
      resourceId: wrapped.result!.internalId,
      before: wrapped.result!.before,
      scopeMode: wrapped.scopeMode,
    });
    res.status(204).end();
  }),
);
