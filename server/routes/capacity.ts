import { Router } from 'express';
import { mockCapacityMetrics, getCriticalMetrics } from '../../src/mocks/capacityMetrics';
import { mockCapacityThresholds } from '../../src/mocks/capacityThresholds';
import {
  mockCapacityForecasts,
  getActiveForecastsForMetric,
  getForecastsWithImminentBreach,
} from '../../src/mocks/capacityForecasts';
import { mockCapacityTimeSeries, getTimeSeriesForMetric } from '../../src/mocks/capacityTimeSeries';
import { mockScalingRecommendations, getOpenRecommendations } from '../../src/mocks/scalingRecommendations';
import { asyncHandler, qBool, qString } from '../util';

export const capacityRouter = Router();

capacityRouter.get('/capacity/metrics', asyncHandler(async (req, res) => {
  res.json(qBool(req.query.critical) ? getCriticalMetrics() : mockCapacityMetrics);
}));
capacityRouter.get('/capacity/thresholds', asyncHandler(async (_req, res) => res.json(mockCapacityThresholds)));
capacityRouter.get('/capacity/forecasts', asyncHandler(async (req, res) => {
  const metricId = qString(req.query.metricId);
  if (metricId) return res.json(getActiveForecastsForMetric(metricId));
  if (qBool(req.query.imminent)) return res.json(getForecastsWithImminentBreach());
  res.json(mockCapacityForecasts);
}));
capacityRouter.get('/capacity/time-series', asyncHandler(async (req, res) => {
  const metricId = qString(req.query.metricId);
  res.json(metricId ? getTimeSeriesForMetric(metricId) : mockCapacityTimeSeries);
}));
capacityRouter.get('/capacity/recommendations', asyncHandler(async (req, res) => {
  res.json(qBool(req.query.open) ? getOpenRecommendations() : mockScalingRecommendations);
}));
