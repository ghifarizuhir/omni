import { Router } from 'express';
import type {
  CapacityMetric, CapacityThreshold, CapacityForecast, CapacityDataPoint,
  ScalingRecommendation,
} from '../../src/types';
import { listByKind } from '../repositories/documents';
import { asyncHandler, qBool, qString } from '../util';

export const capacityRouter = Router();

// "Critical" surfaces metrics at or above their critical threshold (or in the
// upper warning band). Matches the mock helper `getCriticalMetrics()`.
const isCritical = (m: CapacityMetric): boolean =>
  m.utilizationPercent >= (m.criticalThreshold ?? 90);

capacityRouter.get('/capacity/metrics', asyncHandler(async (req, res) => {
  const all = await listByKind<CapacityMetric>(req.tenantId, 'capacity-metric');
  res.json(qBool(req.query.critical) ? all.filter(isCritical) : all);
}));

capacityRouter.get('/capacity/thresholds', asyncHandler(async (req, res) => {
  res.json(await listByKind<CapacityThreshold>(req.tenantId, 'capacity-threshold'));
}));

capacityRouter.get('/capacity/forecasts', asyncHandler(async (req, res) => {
  const all = await listByKind<CapacityForecast>(req.tenantId, 'capacity-forecast');
  const metricId = qString(req.query.metricId);
  if (metricId) return res.json(all.filter(f => f.metricId === metricId));
  if (qBool(req.query.imminent)) {
    const SOON_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
    return res.json(all.filter(f =>
      f.predictedBreachDate && new Date(f.predictedBreachDate).getTime() - Date.now() < SOON_MS,
    ));
  }
  res.json(all);
}));

capacityRouter.get('/capacity/time-series', asyncHandler(async (req, res) => {
  const all = await listByKind<CapacityDataPoint>(req.tenantId, 'capacity-time-series');
  const metricId = qString(req.query.metricId);
  res.json(metricId ? all.filter(p => p.metricId === metricId) : all);
}));

capacityRouter.get('/capacity/recommendations', asyncHandler(async (req, res) => {
  const all = await listByKind<ScalingRecommendation>(req.tenantId, 'scaling-rec');
  // The mock data uses `status: 'open'` even though the (older) type union
  // doesn't include it; trust the runtime value via a string check.
  res.json(qBool(req.query.open) ? all.filter(r => String((r as { status?: string }).status) === 'open') : all);
}));
