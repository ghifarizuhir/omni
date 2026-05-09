import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CapacityMetric } from '../../types';
import { capacityResourceTypeMeta } from '../../lib/constants';
import { UtilizationBar } from './UtilizationBar';
import { TrendIndicator } from './TrendIndicator';
import { MetricSparkline } from './MetricSparkline';

interface MetricCardProps {
  metric: CapacityMetric;
  onClick: () => void;
  isExpanded?: boolean;
}

function getBorderColor(util: number, warning: number, critical: number): string {
  if (util >= critical) return '#F04438';
  if (util >= warning) return '#F79009';
  return '#12B76A';
}

export function MetricCard({ metric, onClick, isExpanded }: MetricCardProps) {
  const borderColor = getBorderColor(metric.utilizationPercent, metric.warningThreshold, metric.criticalThreshold);
  const resourceMeta = capacityResourceTypeMeta[metric.resourceType];

  return (
    <div
      className={cn(
        'relative rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md',
        isExpanded && 'ring-2 ring-blue-500',
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
      onClick={onClick}
    >
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400">{metric.publicId}</span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600"
              >
                {resourceMeta.label}
              </span>
            </div>
            <h3 className="mt-1 text-sm font-semibold text-gray-900 truncate">{metric.name}</h3>
          </div>
          <Link
            to={`/cmdb/${metric.ciId}`}
            className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            onClick={e => e.stopPropagation()}
          >
            {metric.ciPublicId}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Current utilization */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Current: <span className="font-medium text-gray-800">{metric.currentValue} {metric.unit}</span></span>
            <span className="font-semibold text-gray-800">{metric.utilizationPercent}%</span>
          </div>
          <UtilizationBar
            value={metric.utilizationPercent}
            warningThreshold={metric.warningThreshold}
            criticalThreshold={metric.criticalThreshold}
          />
        </div>

        {/* Trend + peaks */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            Trend: <TrendIndicator trend={metric.trend7d} changePercent={metric.changePercent7d} size="sm" />
          </span>
          <span>Peak 24h: <span className="font-medium text-gray-700">{metric.peakLast24h}%</span></span>
          <span>7d: <span className="font-medium text-gray-700">{metric.peakLast7d}%</span></span>
        </div>

        {/* Sparkline */}
        <MetricSparkline
          metricId={metric.id}
          warningThreshold={metric.warningThreshold}
          criticalThreshold={metric.criticalThreshold}
          height={40}
        />

        {/* Thresholds */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Thresholds:</span>
          <span className="text-amber-600 font-medium">⚠ {metric.warningThreshold}%</span>
          <span className="text-red-600 font-medium">🔴 {metric.criticalThreshold}%</span>
        </div>
      </div>
    </div>
  );
}
