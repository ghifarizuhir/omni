import type {
  CapacityMetric, CapacityThreshold, CapacityForecast, CapacityDataPoint,
  ScalingRecommendation,
} from '../types';
import { apiFetch } from './core';

export const capacityService = {
  metrics: () => apiFetch<CapacityMetric[]>('/capacity/metrics'),
  criticalMetrics: () => apiFetch<CapacityMetric[]>('/capacity/metrics', { query: { critical: true } }),
  thresholds: () => apiFetch<CapacityThreshold[]>('/capacity/thresholds'),
  forecasts: () => apiFetch<CapacityForecast[]>('/capacity/forecasts'),
  timeSeries: () => apiFetch<CapacityDataPoint[]>('/capacity/time-series'),
  timeSeriesForMetric: (metricId: string) =>
    apiFetch<CapacityDataPoint[]>('/capacity/time-series', { query: { metricId } }),
  forecastsForMetric: (metricId: string) =>
    apiFetch<CapacityForecast[]>('/capacity/forecasts', { query: { metricId } }),
  imminentForecasts: () => apiFetch<CapacityForecast[]>('/capacity/forecasts', { query: { imminent: true } }),
  recommendations: () => apiFetch<ScalingRecommendation[]>('/capacity/recommendations'),
  openRecommendations: () => apiFetch<ScalingRecommendation[]>('/capacity/recommendations', { query: { open: true } }),
};
