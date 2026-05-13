import { Router } from 'express';
import { mockOutages } from '../../src/mocks/outages';
import { mockSLATargets } from '../../src/mocks/slaTargets';
import { mockSLABreaches, getActiveBreaches } from '../../src/mocks/slaBreaches';
import { mockDailyServiceHealth } from '../../src/mocks/dailyServiceHealth';
import { mockAvailabilityData } from '../../src/mocks/availabilityData';
import { asyncHandler, qBool } from '../util';

export const availabilityRouter = Router();

availabilityRouter.get('/availability/outages', asyncHandler(async (_req, res) => res.json(mockOutages)));
availabilityRouter.get('/availability/sla-targets', asyncHandler(async (_req, res) => res.json(mockSLATargets)));
availabilityRouter.get('/availability/sla-breaches', asyncHandler(async (req, res) => {
  res.json(qBool(req.query.active) ? getActiveBreaches() : mockSLABreaches);
}));
availabilityRouter.get('/availability/daily-health', asyncHandler(async (_req, res) => res.json(mockDailyServiceHealth)));
availabilityRouter.get('/availability/series', asyncHandler(async (_req, res) => res.json(mockAvailabilityData)));
