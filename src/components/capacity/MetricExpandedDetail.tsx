import { useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CapacityMetric } from '../../types';
import { capacityService, useResource } from '../../services';
import { CapacityChart } from './CapacityChart';

interface MetricExpandedDetailProps {
  metric: CapacityMetric;
  onClose: () => void;
}

type TimeRange = '24h' | '7d' | '30d';

export function MetricExpandedDetail({ metric, onClose }: MetricExpandedDetailProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const { data: forecasts } = useResource(() => capacityService.forecastsForMetric(metric.id), [metric.id]);
  const primaryForecast = (forecasts ?? [])[0];

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{metric.name}</h3>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Time range selector */}
        <div className="flex items-center gap-1">
          {(['24h', '7d', '30d'] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                timeRange === r
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-500 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        <CapacityChart
          metricId={metric.id}
          metric={metric}
          height={220}
          showThresholds
          showBaseline
        />

        {/* Monitoring rules */}
        {metric.monitoringRulePublicIds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Linked monitoring rules</p>
            <div className="flex flex-wrap gap-2">
              {metric.monitoringRulePublicIds.map(ruleId => (
                <Link
                  key={ruleId}
                  to="/monitoring/rules"
                  className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-700 hover:bg-blue-100"
                >
                  {ruleId}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Forecast info */}
        {primaryForecast && primaryForecast.predictedBreachDate && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
            <p className="text-xs font-medium text-amber-700">Predicted breach</p>
            <p className="text-xs text-amber-600">
              <span className="font-semibold">
                {new Date(primaryForecast.predictedBreachDate).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
              {primaryForecast.daysUntilBreach !== undefined && (
                <span className="ml-1">
                  ({primaryForecast.daysUntilBreach === 0
                    ? 'Already breached'
                    : `${primaryForecast.daysUntilBreach} days`})
                </span>
              )}
            </p>
            <Link
              to="/capacity/forecast"
              className="inline-flex items-center text-xs font-medium text-amber-700 underline hover:text-amber-900"
            >
              View forecast
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
