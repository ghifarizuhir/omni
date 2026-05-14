import { Router } from 'express';
import type {
  Outage, SLATarget, SLABreach,
} from '../../src/types';
import type { mockDailyServiceHealth as DailyHealth } from '../../src/mocks/dailyServiceHealth';
import type { mockAvailabilityData as AvailSeries } from '../../src/mocks/availabilityData';
import { listByKind } from '../repositories/documents';
import { asyncHandler, qBool } from '../util';

export const availabilityRouter = Router();

availabilityRouter.get('/availability/outages', asyncHandler(async (req, res) => {
  res.json(await listByKind<Outage>(req.tenantId, 'outage'));
}));

availabilityRouter.get('/availability/sla-targets', asyncHandler(async (req, res) => {
  res.json(await listByKind<SLATarget>(req.tenantId, 'sla-target'));
}));

availabilityRouter.get('/availability/sla-breaches', asyncHandler(async (req, res) => {
  const all = await listByKind<SLABreach>(req.tenantId, 'sla-breach');
  res.json(qBool(req.query.active) ? all.filter(b => b.status === 'active') : all);
}));

availabilityRouter.get('/availability/daily-health', asyncHandler(async (req, res) => {
  res.json(await listByKind<typeof DailyHealth[number]>(req.tenantId, 'daily-health'));
}));

availabilityRouter.get('/availability/series', asyncHandler(async (req, res) => {
  res.json(await listByKind<typeof AvailSeries[number]>(req.tenantId, 'availability-series'));
}));
