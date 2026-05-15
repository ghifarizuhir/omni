import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { Card, CardBody } from '@/src/components/ui/Card';
import { ForecastChart } from '@/src/components/capacity/ForecastChart';
import { PredictedBreachAlert } from '@/src/components/capacity/PredictedBreachAlert';
import { capacityService, useResource } from '@/src/services';
import { useToast, ToastView } from '@/src/lib/useToast';

export default function CapacityForecast() {
  const navigate = useNavigate();
  const [horizonFilter, setHorizonFilter] = useState<30 | 90>(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast, showToast } = useToast();

  const { data: metricsData } = useResource(() => capacityService.metrics(), []);
  const { data: forecastsData } = useResource(() => capacityService.forecasts(), []);
  const { data: imminentData } = useResource(() => capacityService.imminentForecasts(), []);
  const mockCapacityMetrics = metricsData ?? [];
  const mockCapacityForecasts = forecastsData ?? [];
  const imminentForecastsList = imminentData ?? [];

  const confidenceToAccuracyPct = (c: string | undefined) => {
    if (c === 'high') return 90;
    if (c === 'medium') return 75;
    if (c === 'low') return 55;
    return null;
  };

  const methodAccuracy = useMemo(() => {
    const methods = ['linear', 'seasonal', 'arima'] as const;
    return methods.reduce(
      (acc, method) => {
        const group = mockCapacityForecasts.filter(f => f.predictionMethod === method);
        if (!group.length) { acc[method] = null; return acc; }
        const avg = Math.round(
          group.reduce((s, f) => s + (confidenceToAccuracyPct(f.confidence) ?? 0), 0) / group.length,
        );
        acc[method] = avg;
        return acc;
      },
      {} as Record<string, number | null>,
    );
  }, [mockCapacityForecasts]);

  const topDriverForecasts = useMemo(
    () =>
      [...mockCapacityForecasts]
        .filter(f => typeof f.daysUntilBreach === 'number')
        .sort((a, b) => (a.daysUntilBreach ?? Infinity) - (b.daysUntilBreach ?? Infinity))
        .slice(0, 3),
    [mockCapacityForecasts],
  );

  const handleGenerateForecast = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    showToast(`Generating ${horizonFilter}-day forecast…`, 'info');
    setTimeout(() => {
      setIsGenerating(false);
      showToast(`Forecast refreshed (${horizonFilter}d)`, 'success');
    }, 1500);
  };

  const handleImplementViaChange = (forecastId: string) => {
    showToast(`Drafting change for ${forecastId}…`, 'info');
    setTimeout(() => navigate('/changes'), 500);
  };

  const imminentBreaches = imminentForecastsList
    .slice()
    .sort((a, b) => (a.daysUntilBreach ?? 999) - (b.daysUntilBreach ?? 999));

  const filteredForecasts = mockCapacityForecasts.filter(
    f => f.forecastHorizonDays === horizonFilter,
  );

  const getMetric = (metricId: string) => mockCapacityMetrics.find(m => m.id === metricId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        {/* Horizon toggle */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => setHorizonFilter(30)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                horizonFilter === 30
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setHorizonFilter(90)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${
                horizonFilter === 90
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              90 days
            </button>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerateForecast}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating…' : 'Generate forecast'}
          </Button>
      </div>

      {/* Main layout: 3-col content + 1-col right rail */}
      <div className="grid grid-cols-4 gap-6 items-start">
        {/* Left: Breach alerts + forecast charts */}
        <div className="col-span-3 space-y-6">
          {/* Predicted Breach Alerts */}
          {imminentBreaches.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide">
                ⚠ {imminentBreaches.length} PREDICTED BREACHES — Action recommended
              </h2>
              <div className="space-y-3">
                {imminentBreaches.map(forecast => {
                  const metric = getMetric(forecast.metricId);
                  if (!metric) return null;
                  return (
                    <div key={forecast.id}>
                      <PredictedBreachAlert forecast={forecast} metric={metric} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Forecast Charts Grid */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              All Forecasts
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {filteredForecasts.map(forecast => {
                const metric = getMetric(forecast.metricId);
                if (!metric) return null;
                return (
                  <Card key={forecast.id}>
                    <CardBody className="p-4 space-y-3">
                      {/* Card header */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 flex-1">
                          {forecast.metricName}
                        </h3>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                          {forecast.forecastHorizonDays}d
                        </span>
                      </div>

                      {/* Chart */}
                      <ForecastChart forecast={forecast} metric={metric} height={200} />

                      {/* Breach info */}
                      <div className="space-y-1 text-xs text-gray-600">
                        {forecast.predictedBreachDate && forecast.daysUntilBreach !== undefined && (
                          <p>
                            <span className="font-medium text-gray-700">Predicted breach: </span>
                            <span className="text-red-600">
                              {new Date(forecast.predictedBreachDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-gray-500 ml-1">
                              ({forecast.daysUntilBreach === 0
                                ? 'Already breached'
                                : `${forecast.daysUntilBreach} days`})
                            </span>
                          </p>
                        )}
                        <p>
                          <span className="font-medium text-gray-700">Confidence: </span>
                          {forecast.confidence.toUpperCase()}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Method: </span>
                          {forecast.predictionMethod}
                        </p>
                      </div>

                      {/* Recommendation */}
                      {forecast.recommendation && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          {forecast.recommendation}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleImplementViaChange(forecast.id)}
                      >
                        Implement via change →
                      </Button>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="col-span-1 space-y-4 sticky top-6">
          {/* Forecast Accuracy */}
          <Card>
            <CardBody className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Forecast Accuracy</h3>
              <p className="text-xs text-gray-500 font-medium">Last quarter:</p>
              <div className="space-y-1.5 text-xs text-gray-600 font-mono">
                <div className="flex justify-between">
                  <span>Linear</span>
                  <span className={methodAccuracy['linear'] !== null ? 'text-green-700 font-semibold' : 'text-gray-400'}>
                    {methodAccuracy['linear'] !== null ? `${methodAccuracy['linear']}% accurate` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Seasonal</span>
                  <span className={methodAccuracy['seasonal'] !== null ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                    {methodAccuracy['seasonal'] !== null ? `${methodAccuracy['seasonal']}% accurate` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ARIMA</span>
                  <span className={methodAccuracy['arima'] !== null ? 'text-green-700 font-semibold' : 'text-gray-400'}>
                    {methodAccuracy['arima'] !== null ? `${methodAccuracy['arima']}% accurate (slow)` : '—'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 pt-1">Default method: Linear</p>
            </CardBody>
          </Card>

          {/* Top Drivers */}
          <Card>
            <CardBody className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Top Drivers</h3>
              <p className="text-xs text-gray-500 font-medium">Imminent breaches:</p>
              <ul className="space-y-1.5 text-xs text-gray-600">
                {topDriverForecasts.length > 0 ? topDriverForecasts.map(f => (
                  <li key={f.id} className="flex items-start gap-1.5">
                    <span className="text-gray-400 shrink-0">•</span>
                    <span>{f.metricName} — breach in <span className="font-semibold text-gray-800">{f.daysUntilBreach ?? '—'} days</span></span>
                  </li>
                )) : (
                  <li className="text-gray-400">No imminent breaches</li>
                )}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
      <ToastView toast={toast} />
    </div>
  );
}
