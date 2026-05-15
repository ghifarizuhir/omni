import { Router, type Request } from 'express';
import { servicesRepo } from '../repositories/docs';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qString, required } from '../util';
import { audit } from '../audit';
import { updateCISchema } from '../../src/shared/schemas/ci';
import { ScopeViolationError } from '../scope/errors';
import { applyEnforcement } from '../scope/enforcement';
import { cmdbRepo } from '../repositories/cmdb';

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
// Routes through req.scoped so scope enforcement (off/warn/enforce) applies.
// ScopeViolationError is caught at the route boundary; applyEnforcement decides
// whether to 403 (enforce), warn (warn), or silently allow (off).
cmdbRouter.patch('/cis/:publicId', requirePermission('cmdb.write'), asyncHandler(async (req, res) => {
  const body = updateCISchema.parse(req.body);
  try {
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
  } catch (e) {
    if (e instanceof ScopeViolationError) {
      // applyEnforcement throws in 'enforce' mode; in 'warn'/'off' it returns.
      applyEnforcement(e, res);
      // Bypass: perform the update via the raw repo (scope already checked intent).
      const result = await cmdbRepo.updateCI(req.tenantId, req.params.publicId, body);
      if (!result) throw new HttpError(404, 'CI not found');
      await audit(req, {
        action: 'update',
        resourceKind: 'ConfigurationItem',
        resourceId: result.internalId,
        before: result.before,
        after: result.after,
        scopeMode: 'admin',
      });
      return res.json(result.after);
    }
    throw e;
  }
}));

cmdbRouter.get('/services', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(await servicesRepo.list(req.tenantId));
}));

cmdbRouter.get('/services/:id', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(required(await servicesRepo.get(req.tenantId, req.params.id), 'Service'));
}));
