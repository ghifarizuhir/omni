import { Router } from 'express';
import {
  problemsRepo, changesRepo, releasesRepo, deploymentsRepo,
  requestsRepo, catalogRepo, kbRepo,
} from '../repositories/docs';
import { listByKind, findByPublicId, findByKey } from '../repositories/documents';
import { asyncHandler, qBool, required } from '../util';
import type { ImprovementInitiative } from '../../src/types';

export const itsmRouter = Router();

itsmRouter.get('/problems', asyncHandler(async (req, res) => res.json(await problemsRepo.list(req.tenantId))));
itsmRouter.get('/problems/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await problemsRepo.get(req.tenantId, req.params.publicId), 'Problem'));
}));

itsmRouter.get('/changes', asyncHandler(async (req, res) => res.json(await changesRepo.list(req.tenantId))));
itsmRouter.get('/changes/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await changesRepo.get(req.tenantId, req.params.publicId), 'Change'));
}));

itsmRouter.get('/releases', asyncHandler(async (req, res) => res.json(await releasesRepo.list(req.tenantId))));
itsmRouter.get('/releases/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await releasesRepo.get(req.tenantId, req.params.publicId), 'Release'));
}));

itsmRouter.get('/deployments', asyncHandler(async (req, res) => {
  res.json(qBool(req.query.active)
    ? await deploymentsRepo.active(req.tenantId)
    : await deploymentsRepo.list(req.tenantId));
}));
itsmRouter.get('/deployments/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await deploymentsRepo.get(req.tenantId, req.params.publicId), 'Deployment'));
}));
itsmRouter.get('/deployments/:deploymentId/logs', asyncHandler(async (req, res) => {
  res.json(await deploymentsRepo.logs(req.tenantId, req.params.deploymentId));
}));
itsmRouter.get('/environments', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'environment'));
}));

itsmRouter.get('/requests', asyncHandler(async (req, res) => res.json(await requestsRepo.list(req.tenantId))));
itsmRouter.get('/requests/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await requestsRepo.get(req.tenantId, req.params.publicId), 'ServiceRequest'));
}));
itsmRouter.get('/catalog', asyncHandler(async (req, res) => res.json(await catalogRepo.list(req.tenantId))));

// Improvements — DB-backed via documents. Totals/ROI computed inline.
itsmRouter.get('/improvements', asyncHandler(async (req, res) => {
  res.json(await listByKind<ImprovementInitiative>(req.tenantId, 'improvement'));
}));
itsmRouter.get('/improvements/totals/estimated', asyncHandler(async (req, res) => {
  const items = await listByKind<ImprovementInitiative>(req.tenantId, 'improvement');
  res.json(items.reduce((sum, i) => sum + (i.estimatedBenefit?.annualValueUSD ?? 0), 0));
}));
itsmRouter.get('/improvements/totals/actual', asyncHandler(async (req, res) => {
  const items = await listByKind<ImprovementInitiative>(req.tenantId, 'improvement');
  res.json(items.reduce((sum, i) => sum + ((i as { actualBenefit?: { annualValueUSD?: number } }).actualBenefit?.annualValueUSD ?? 0), 0));
}));
itsmRouter.get('/improvements/benefit-measurements', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'benefit-measurement'));
}));
itsmRouter.get('/improvements/roi', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'roi-calc'));
}));
itsmRouter.get('/improvements/:initiativeId/roi', asyncHandler(async (req, res) => {
  const all = await listByKind<{ initiativeId: string }>(req.tenantId, 'roi-calc');
  res.json(all.find(r => r.initiativeId === req.params.initiativeId) ?? null);
}));
itsmRouter.get('/improvements/:publicId', asyncHandler(async (req, res) => {
  // Accept both publicId and internal id, mirroring the legacy `getByAnyId` helper.
  const byPublic = await findByPublicId<ImprovementInitiative>(req.tenantId, 'improvement', req.params.publicId);
  if (byPublic) return res.json(byPublic);
  const byKey = await findByKey<ImprovementInitiative>(req.tenantId, 'improvement', req.params.publicId);
  res.json(required(byKey, 'Improvement'));
}));

// KB articles
itsmRouter.get('/kb/articles', asyncHandler(async (req, res) => res.json(await kbRepo.list(req.tenantId))));
itsmRouter.get('/kb/articles/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await kbRepo.get(req.tenantId, req.params.publicId), 'KBArticle'));
}));
