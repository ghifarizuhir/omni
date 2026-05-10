import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MetricDefinition } from '@/src/types/measurement';

interface MetricValueDisplayProps {
  metric: MetricDefinition;
}

function isHigherBetter(metric: MetricDefinition): boolean {
  const name = metric.name.toLowerCase();
  const cat = metric.category;
  if (cat === 'availability') return true;
  if (name.includes('success') || name.includes('uptime') || name.includes('fulfillment') || name.includes('compliance')) return true;
  if (name.includes('mttr') || name.includes('failure') || name.includes('error') || name.includes('incident')) return false;
  return true;
}

function formatValue(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === 'minutes') {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (unit === 'days') return `${value}d`;
  return `${value} ${unit}`;
}

export const MetricValueDisplay: React.FC<MetricValueDisplayProps> = ({ metric }) => {
  const { currentValue, target, trend, trendPercent, unit } = metric;
  const higherBetter = isHigherBetter(metric);

  const valueColor: string = (() => {
    if (currentValue === undefined || target === undefined) return 'text-ois-text';
    const ok = higherBetter ? currentValue >= target : currentValue <= target;
    return ok ? 'text-[#12B76A]' : 'text-[#F04438]';
  })();

  const trendColor: string = (() => {
    if (!trend || trend === 'stable') return 'text-ois-text-subtle';
    const trendUp = trend === 'up';
    const good = higherBetter ? trendUp : !trendUp;
    return good ? 'text-[#12B76A]' : 'text-[#F04438]';
  })();

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex flex-col gap-0.5">
      {/* Value */}
      <span className={cn('text-lg font-bold leading-tight', valueColor)}>
        {currentValue !== undefined ? formatValue(currentValue, unit) : '—'}
      </span>

      {/* Target */}
      {target !== undefined && (
        <span className="text-[11px] text-ois-text-subtle">
          Target: {formatValue(target, unit)}
        </span>
      )}

      {/* Trend */}
      {trend && trend !== 'stable' && trendPercent !== undefined && (
        <div className={cn('flex items-center gap-0.5 text-xs font-semibold', trendColor)}>
          <TrendIcon size={12} />
          <span>{Math.abs(trendPercent)}%</span>
        </div>
      )}
      {trend === 'stable' && (
        <div className="flex items-center gap-0.5 text-xs text-ois-text-subtle">
          <Minus size={12} />
          <span>Stable</span>
        </div>
      )}
    </div>
  );
};
