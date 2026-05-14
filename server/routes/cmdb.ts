import { Router } from 'express';
import { cmdbRepo } from '../repositories/cmdb';
import { servicesRepo } from '../repositories/docs';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qString, required } from '../util';
import { audit } from '../audit';
import { updateCISchema } from '../../src/shared/schemas/ci';

export const cmdbRouter = Router();

cmdbRouter.get('/cis', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listCIs(req.tenantId));
}));

cmdbRouter.get('/cis/relationships', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listRelationships(req.tenantId));
}));

cmdbRouter.get('/cis/audit', requirePermission('cmdb.audit.read'), asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listAudit(req.tenantId, qString(req.query.ciId)));
}));

cmdbRouter.get('/cis/:publicId', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(required(await cmdbRepo.getCI(req.tenantId, req.params.publicId), 'CI'));
}));

cmdbRouter.get('/cis/:ciId/relationships', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listRelationshipsForCI(req.tenantId, req.params.ciId));
}));

// M6.11 (B1.3) — PATCH /cis/:publicId. Partial update guarded by `cmdb.write`.
// Mirrors the events PATCH /status shape: Zod body → repo writes the snapshot
// in a transaction, this handler emits an audit log with before/after.
cmdbRouter.patch('/cis/:publicId', requirePermission('cmdb.write'), asyncHandler(async (req, res) => {
  const body = updateCISchema.parse(req.body);
  const result = await cmdbRepo.updateCI(req.tenantId, req.params.publicId, body);
  if (!result) throw new HttpError(404, 'CI not found');
  await audit(req, {
    action: 'update',
    resourceKind: 'ConfigurationItem',
    resourceId: result.internalId,
    before: result.before,
    after: result.after,
  });
  res.json(result.after);
}));

cmdbRouter.get('/services', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(await servicesRepo.list(req.tenantId));
}));

cmdbRouter.get('/services/:id', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(required(await servicesRepo.get(req.tenantId, req.params.id), 'Service'));
}));
