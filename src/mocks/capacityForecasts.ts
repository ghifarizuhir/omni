import { CapacityForecast } from '../types';

function generatePredictions(
  startValue: number,
  endValue: number,
  days: number,
  startDateStr: string,
  ciBand: number = 5,
): CapacityForecast['predictions'] {
  const result: CapacityForecast['predictions'] = [];
  const start = new Date(startDateStr);
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const value = days > 1 ? startValue + (endValue - startValue) * (i / (days - 1)) : startValue;
    result.push({
      date: date.toISOString().split('T')[0],
      predictedValue: Math.round(value * 10) / 10,
      confidenceLowerBound: Math.round((value - ciBand) * 10) / 10,
      confidenceUpperBound: Math.round((value + ciBand) * 10) / 10,
    });
  }
  return result;
}

export const mockCapacityForecasts: CapacityForecast[] = [
  {
    id: 'fct-cap-pay-cpu-001-30d',
    metricId: 'cap-pay-cpu-001',
    metricPublicId: 'CAP-PAY-CPU-001',
    metricName: 'Payment API CPU',
    predictionMethod: 'linear',
    forecastHorizonDays: 30,
    predictions: generatePredictions(67, 85, 30, '2026-05-08', 5),
    predictedBreachDate: '2026-05-22',
    predictedCriticalDate: '2026-06-08',
    daysUntilBreach: 14,
    confidence: 'high',
    recommendation: 'Scale up payment-api by 25% within 14 days. Consider adding 2 replicas.',
    generatedAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'fct-cap-pay-dbconn-001-30d',
    metricId: 'cap-pay-dbconn-001',
    metricPublicId: 'CAP-PAY-DBCONN-001',
    metricName: 'Payment Postgres connection pool',
    predictionMethod: 'linear',
    forecastHorizonDays: 30,
    predictions: generatePredictions(90, 98, 30, '2026-05-08', 2),
    predictedBreachDate: '2026-05-01',
    daysUntilBreach: 0,
    confidence: 'high',
    recommendation: 'Immediate action: pgbouncer migration via CHG-2026-00091 will resolve pool saturation.',
    generatedAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'fct-cap-ord-cpu-001-30d',
    metricId: 'cap-ord-cpu-001',
    metricPublicId: 'CAP-ORD-CPU-001',
    metricName: 'Order API CPU',
    predictionMethod: 'linear',
    forecastHorizonDays: 30,
    predictions: generatePredictions(71, 92, 30, '2026-05-08', 5),
    predictedBreachDate: '2026-05-16',
    predictedCriticalDate: '2026-06-01',
    daysUntilBreach: 8,
    confidence: 'high',
    recommendation: 'Scale up order-api by 30%. Add 2 replicas within 8 days.',
    generatedAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'fct-cap-search-iops-001-30d',
    metricId: 'cap-search-iops-001',
    metricPublicId: 'CAP-SEARCH-IOPS-001',
    metricName: 'Search ES storage IOPS',
    predictionMethod: 'linear',
    forecastHorizonDays: 30,
    predictions: generatePredictions(8500, 10500, 30, '2026-05-08', 200),
    predictedBreachDate: '2026-05-13',
    daysUntilBreach: 5,
    confidence: 'high',
    recommendation: 'Increase storage tier from gp3 to io2 within 5 days.',
    generatedAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'fct-cap-pay-cpu-001-90d',
    metricId: 'cap-pay-cpu-001',
    metricPublicId: 'CAP-PAY-CPU-001',
    metricName: 'Payment API CPU',
    predictionMethod: 'linear',
    forecastHorizonDays: 90,
    predictions: generatePredictions(67, 100, 90, '2026-05-08', 8),
    predictedBreachDate: '2026-05-22',
    predictedCriticalDate: '2026-06-08',
    daysUntilBreach: 14,
    confidence: 'medium',
    recommendation: 'Scale up payment-api by 25% within 14 days. Consider adding 2 replicas.',
    generatedAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'fct-cap-pay-mem-001-30d',
    metricId: 'cap-pay-mem-001',
    metricPublicId: 'CAP-PAY-MEM-001',
    metricName: 'Payment API Memory',
    predictionMethod: 'linear',
    forecastHorizonDays: 30,
    predictions: generatePredictions(78, 88, 30, '2026-05-08', 3),
    predictedBreachDate: '2026-05-29',
    daysUntilBreach: 21,
    confidence: 'medium',
    recommendation: 'Monitor memory trend. Consider increasing heap allocation if trend continues.',
    generatedAt: '2026-05-08T06:00:00Z',
  },
];

export const getActiveForecastsForMetric = (metricId: string) =>
  mockCapacityForecasts.filter(f => f.metricId === metricId);

export const getForecastsWithImminentBreach = () =>
  mockCapacityForecasts.filter(f => f.daysUntilBreach !== undefined && f.daysUntilBreach <= 14);
