import { Router } from 'express';
import {
  problemsRepo, changesRepo, releasesRepo, deploymentsRepo,
  requestsRepo, catalogRepo, kbRepo,
} from '../repositories/docs';
import { asyncHandler, qBool, required } from '../util';
// Improvements stays mock-backed for now — its computed totals/ROI helpers
// don't cleanly map to the document pattern. Migrate in a follow-up.
import {
  mockImprovements, getImprovementById,
  getTotalEstimatedBenefitUSD, getTotalActualBenefitUSD,
} from '../../src/mocks/improvements';
import { mockBenefitMeasurements } from '../../src/mocks/benefitMeasurements';
import { mockROICalculations, getROICalculation } from '../../src/mocks/roiCalculations';

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
itsmRouter.get('/environments', asyncHandler(async (_req, res) => {
  // Tiny lookup table — staying mock for now.
  const { mockEnvironments } = await import('../../src/mocks/environments');
  res.json(mockEnvironments);
}));

itsmRouter.get('/requests', asyncHandler(async (req, res) => res.json(await requestsRepo.list(req.tenantId))));
itsmRouter.get('/requests/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await requestsRepo.get(req.tenantId, req.params.publicId), 'ServiceRequest'));
}));
itsmRouter.get('/catalog', asyncHandler(async (req, res) => res.json(await catalogRepo.list(req.tenantId))));

// Improvements — mock-backed for now (financial calculation helpers).
itsmRouter.get('/improvements', asyncHandler(async (_req, res) => res.json(mockImprovements)));
itsmRouter.get('/improvements/totals/estimated', asyncHandler(async (_req, res) => res.json(getTotalEstimatedBenefitUSD())));
itsmRouter.get('/improvements/totals/actual', asyncHandler(async (_req, res) => res.json(getTotalActualBenefitUSD())));
itsmRouter.get('/improvements/benefit-measurements', asyncHandler(async (_req, res) => res.json(mockBenefitMeasurements)));
itsmRouter.get('/improvements/roi', asyncHandler(async (_req, res) => res.json(mockROICalculations)));
itsmRouter.get('/improvements/:initiativeId/roi', asyncHandler(async (req, res) => {
  res.json(getROICalculation(req.params.initiativeId));
}));
itsmRouter.get('/improvements/:publicId', asyncHandler(async (req, res) => {
  const found = mockImprovements.find(i => i.publicId === req.params.publicId) ?? getImprovementById(req.params.publicId);
  res.json(required(found, 'Improvement'));
}));

// KB lives here for now; could split into a separate router.
itsmRouter.get('/kb/articles', asyncHandler(async (req, res) => res.json(await kbRepo.list(req.tenantId))));
itsmRouter.get('/kb/articles/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await kbRepo.get(req.tenantId, req.params.publicId), 'KBArticle'));
}));
