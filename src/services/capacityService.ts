import { mockCapacityMetrics, getCriticalMetrics } from '../mocks/capacityMetrics';
import { mockCapacityThresholds } from '../mocks/capacityThresholds';
import {
  mockCapacityForecasts,
  getActiveForecastsForMetric,
  getForecastsWithImminentBreach,
} from '../mocks/capacityForecasts';
import { mockCapacityTimeSeries, getTimeSeriesForMetric } from '../mocks/capacityTimeSeries';
import { mockScalingRecommendations, getOpenRecommendations } from '../mocks/scalingRecommendations';
import type {
  CapacityMetric, CapacityThreshold, CapacityForecast, CapacityDataPoint, ScalingRecommendation,
} from '../types';
import { apiFetch, isLive, mockResult } from './core';

export const capacityService = {
  metrics(): Promise<CapacityMetric[]> {
    if (isLive()) return apiFetch<CapacityMetric[]>('/capacity/metrics');
    return mockResult(mockCapacityMetrics);
  },
  criticalMetrics(): Promise<CapacityMetric[]> {
    if (isLive()) return apiFetch<CapacityMetric[]>('/capacity/metrics', { query: { critical: true } });
    return mockResult(getCriticalMetrics());
  },
  thresholds(): Promise<CapacityThreshold[]> {
    if (isLive()) return apiFetch<CapacityThreshold[]>('/capacity/thresholds');
    return mockResult(mockCapacityThresholds);
  },
  forecasts(): Promise<CapacityForecast[]> {
    if (isLive()) return apiFetch<CapacityForecast[]>('/capacity/forecasts');
    return mockResult(mockCapacityForecasts);
  },
  timeSeries(): Promise<CapacityDataPoint[]> {
    if (isLive()) return apiFetch<CapacityDataPoint[]>('/capacity/time-series');
    return mockResult(mockCapacityTimeSeries);
  },
  timeSeriesForMetric(metricId: string): Promise<CapacityDataPoint[]> {
    if (isLive()) return apiFetch<CapacityDataPoint[]>('/capacity/time-series', { query: { metricId } });
    return mockResult(getTimeSeriesForMetric(metricId));
  },
  forecastsForMetric(metricId: string): Promise<CapacityForecast[]> {
    if (isLive()) return apiFetch<CapacityForecast[]>('/capacity/forecasts', { query: { metricId } });
    return mockResult(getActiveForecastsForMetric(metricId));
  },
  imminentForecasts(): Promise<CapacityForecast[]> {
    if (isLive()) return apiFetch<CapacityForecast[]>('/capacity/forecasts', { query: { imminent: true } });
    return mockResult(getForecastsWithImminentBreach());
  },
  recommendations(): Promise<ScalingRecommendation[]> {
    if (isLive()) return apiFetch<ScalingRecommendation[]>('/capacity/recommendations');
    return mockResult(mockScalingRecommendations);
  },
  openRecommendations(): Promise<ScalingRecommendation[]> {
    if (isLive()) return apiFetch<ScalingRecommendation[]>('/capacity/recommendations', { query: { open: true } });
    return mockResult(getOpenRecommendations());
  },
};
