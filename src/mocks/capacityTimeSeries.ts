import { CapacityDataPoint } from '../types';

function generateTimeSeries(
  metricId: string,
  startValue: number,
  endValue: number,
  capacity: number,
  days: number = 30,
  noiseAmount: number = 2,
): CapacityDataPoint[] {
  const result: CapacityDataPoint[] = [];
  const startDate = new Date('2026-04-08');
  for (let i = 0; i < days; i++) {
    const progress = days > 1 ? i / (days - 1) : 0;
    const trend = startValue + (endValue - startValue) * progress;
    const noise = Math.sin(i * 2.3) * noiseAmount;
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    result.push({
      timestamp: date.toISOString().split('T')[0] + 'T00:00:00Z',
      metricId,
      value: Math.round((trend + noise) * 10) / 10,
      capacity,
    });
  }
  return result;
}

export const mockCapacityTimeSeries: CapacityDataPoint[] = [
  ...generateTimeSeries('cap-pay-cpu-001', 49, 67, 100),
  ...generateTimeSeries('cap-pay-mem-001', 75, 78, 100, 30, 1),
  ...generateTimeSeries('cap-pay-dbconn-001', 12, 18, 20, 30, 0.5),
  ...generateTimeSeries('cap-auth-cpu-001', 48, 52, 100, 30, 2),
  ...generateTimeSeries('cap-auth-rps-001', 225, 245, 500, 30, 5),
  ...generateTimeSeries('cap-ord-cpu-001', 48, 71, 100),
  ...generateTimeSeries('cap-db-pay-disk-001', 55, 62, 100, 30, 1),
  ...generateTimeSeries('cap-db-ord-disk-001', 44, 48, 100, 30, 1),
  ...generateTimeSeries('cap-lb-ext-net-001', 1.0, 1.2, 5, 30, 0.2),
  ...generateTimeSeries('cap-search-iops-001', 7200, 8500, 10000, 30, 100),
  ...generateTimeSeries('cap-notif-queue-001', 900, 1240, 50000, 30, 50),
  ...generateTimeSeries('cap-wiki-users-001', 35, 42, 200, 30, 3),
];

export const getTimeSeriesForMetric = (metricId: string) =>
  mockCapacityTimeSeries.filter(d => d.metricId === metricId);
