import { Router } from 'express';
import { monitoringRepo } from '../repositories/events';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, required } from '../util';

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
