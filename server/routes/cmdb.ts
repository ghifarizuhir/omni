import { Router, type Request } from 'express';
import { servicesRepo } from '../repositories/docs';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qString, required } from '../util';
import { audit } from '../audit';
import { updateCISchema } from '../../src/shared/schemas/ci';

export const cmdbRouter = Router();

/** Convenience accessor — `req.scoped` is attached by withScopedDb middleware. */
const scoped = (req: Request) => req.scoped;

cmdbRouter.get('/cis', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listCIs());
}));

cmdbRouter.get('/cis/relationships', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listRelationships());
}));

cmdbRouter.get('/cis/audit', requirePermission('cmdb.audit.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listAudit(qString(req.query.ciId)));
}));

cmdbRouter.get('/cis/:publicId', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).cmdb.getCI(req.params.publicId), 'CI'));
}));

cmdbRouter.get('/cis/:ciId/relationships', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listRelationshipsForCI(req.params.ciId));
}));

// M6.11 (B1.3) — PATCH /cis/:publicId. Partial update guarded by `cmdb.write`.
// ScopeViolationError propagates to the global error handler → 403.
cmdbRouter.patch('/cis/:publicId', requirePermission('cmdb.write'), asyncHandler(async (req, res) => {
  const body = updateCISchema.parse(req.body);
  const wrapped = await scoped(req).cmdb.updateCI(req.params.publicId, body);
  if (!wrapped) throw new HttpError(404, 'CI not found');
  await audit(req, {
    action: 'update',
    resourceKind: 'ConfigurationItem',
    resourceId: wrapped.result!.internalId,
    before: wrapped.result!.before,
    after: wrapped.result!.after,
    scopeMode: wrapped.scopeMode,
  });
  res.json(wrapped.result!.after);
}));

cmdbRouter.get('/services', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(await servicesRepo.list(req.tenantId));
}));

cmdbRouter.get('/services/:id', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(required(await servicesRepo.get(req.tenantId, req.params.id), 'Service'));
}));
