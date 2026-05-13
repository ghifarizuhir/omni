import { Router } from 'express';
import { cmdbRepo } from '../repositories/cmdb';
import { servicesRepo } from '../repositories/docs';
import { asyncHandler, qString, required } from '../util';

export const cmdbRouter = Router();

cmdbRouter.get('/cis', asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listCIs(req.tenantId));
}));

cmdbRouter.get('/cis/relationships', asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listRelationships(req.tenantId));
}));

cmdbRouter.get('/cis/audit', asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listAudit(req.tenantId, qString(req.query.ciId)));
}));

cmdbRouter.get('/cis/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await cmdbRepo.getCI(req.tenantId, req.params.publicId), 'CI'));
}));

cmdbRouter.get('/cis/:ciId/relationships', asyncHandler(async (req, res) => {
  res.json(await cmdbRepo.listRelationshipsForCI(req.tenantId, req.params.ciId));
}));

cmdbRouter.get('/services', asyncHandler(async (req, res) => {
  res.json(await servicesRepo.list(req.tenantId));
}));

cmdbRouter.get('/services/:id', asyncHandler(async (req, res) => {
  res.json(required(await servicesRepo.get(req.tenantId, req.params.id), 'Service'));
}));
