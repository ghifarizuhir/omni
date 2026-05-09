import { AlertTriangle, Flame, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CapacityForecast, CapacityMetric } from '../../types';
import { Button } from '../ui/Button';

interface PredictedBreachAlertProps {
  forecast: CapacityForecast;
  metric: CapacityMetric;
}

export function PredictedBreachAlert({ forecast, metric }: PredictedBreachAlertProps) {
  const days = forecast.daysUntilBreach;

  if (days === undefined) return null;

  if (days === 0) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          CRITICAL — Already breached
        </div>
        <p className="text-sm text-red-700 font-medium">{metric.name}</p>
        <p className="text-xs text-red-600">Currently {metric.utilizationPercent}% utilized</p>
        {forecast.recommendation && (
          <p className="text-xs text-red-600">{forecast.recommendation}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Link to="/capacity/forecast">
            <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
              View forecast
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (days <= 5) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
          <Flame className="h-4 w-4 shrink-0" />
          URGENT — Breach within {days} day{days !== 1 ? 's' : ''}
        </div>
        <p className="text-sm font-medium text-red-700">{metric.name}</p>
        <p className="text-xs text-red-600">
          {metric.utilizationPercent}% utilized → predicted breach at{' '}
          {forecast.predictedBreachDate
            ? new Date(forecast.predictedBreachDate).toLocaleDateString()
            : 'unknown'}
        </p>
        <p className="text-xs font-medium text-red-600 uppercase">
          Confidence: {forecast.confidence}
        </p>
        {forecast.recommendation && (
          <p className="text-xs text-red-500">{forecast.recommendation}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Link to="/capacity/forecast">
            <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
              View forecast
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={() => console.log('take action', forecast.metricId)}
          >
            Take action
          </Button>
        </div>
      </div>
    );
  }

  if (days <= 14) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          HIGH — Breach within {days} days
        </div>
        <p className="text-sm font-medium text-amber-700">{metric.name}</p>
        <p className="text-xs text-amber-600">
          {metric.utilizationPercent}% utilized → predicted breach at{' '}
          {forecast.predictedBreachDate
            ? new Date(forecast.predictedBreachDate).toLocaleDateString()
            : 'unknown'}
        </p>
        <p className="text-xs font-medium text-amber-600 uppercase">
          Confidence: {forecast.confidence}
        </p>
        {forecast.recommendation && (
          <p className="text-xs text-amber-500">{forecast.recommendation}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Link to="/capacity/forecast">
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              View forecast
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            onClick={() => console.log('take action', forecast.metricId)}
          >
            Take action
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
