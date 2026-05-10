import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MetricDefinition } from '@/src/types/measurement';
import { metricCategoryMeta } from '@/src/lib/constants';
import { MetricValueDisplay } from './MetricValueDisplay';
import { MetricExpandedDetail } from './MetricExpandedDetail';

interface MetricCardProps {
  metric: MetricDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}

function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined) return '—';
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === 'minutes') {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (unit === 'days') return `${value}d`;
  return `${value} ${unit}`;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric, isExpanded, onToggle }) => {
  const catMeta = metricCategoryMeta[metric.category];

  return (
    <div
      className={cn(
        'bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card transition-shadow cursor-pointer',
        isExpanded ? 'shadow-md' : 'hover:shadow-md',
      )}
      onClick={onToggle}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Top row: publicId + category */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-ois-text-subtle">{metric.publicId}</span>
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${catMeta.color}18`, color: catMeta.color, borderColor: `${catMeta.color}30` }}
          >
            {catMeta.label}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-base font-semibold text-ois-text leading-tight">{metric.displayName}</h3>

        {/* Value / Target / Benchmark row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Current</p>
            <MetricValueDisplay metric={metric} />
          </div>
          {metric.target !== undefined && (
            <div>
              <p className="text-[10px] font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Target</p>
              <span className="text-sm font-semibold text-ois-text">{formatValue(metric.target, metric.unit)}</span>
            </div>
          )}
          {metric.industryBenchmark !== undefined && (
            <div>
              <p className="text-[10px] font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Benchmark</p>
              <span className="text-sm text-ois-text-subtle">
                {formatValue(metric.industryBenchmark, metric.unit)}
              </span>
              {metric.benchmarkSource && (
                <p className="text-[10px] text-ois-text-muted mt-0.5 leading-tight">{metric.benchmarkSource}</p>
              )}
            </div>
          )}
        </div>

        {/* Formula snippet */}
        {metric.formula && (
          <div className="rounded-md bg-ois-surface-muted px-3 py-1.5">
            <p className="text-[10px] font-semibold text-ois-text-muted uppercase tracking-wider mb-0.5">Formula</p>
            <p className="font-mono text-[11px] text-ois-text-subtle line-clamp-1">{metric.formula}</p>
          </div>
        )}

        {/* Source + frequency */}
        <p className="text-[11px] text-ois-text-muted">
          Source: <span className="text-ois-text-subtle">{metric.sourceSystem}</span>
          {' · '}Updated: <span className="text-ois-text-subtle">{metric.updateFrequency}</span>
        </p>

        {/* Used in */}
        {(metric.usedInDashboardIds.length > 0 || metric.usedInReportIds.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {metric.usedInDashboardIds.slice(0, 2).map((id) => (
              <span key={id} className="inline-flex items-center rounded-full bg-ois-primary-pale border border-ois-primary/20 px-2 py-0.5 text-[10px] text-ois-primary font-medium">
                {id}
              </span>
            ))}
            {metric.usedInReportIds.slice(0, 2).map((id) => (
              <span key={id} className="inline-flex items-center rounded-full bg-ois-surface-muted border border-ois-border px-2 py-0.5 text-[10px] text-ois-text-muted font-medium">
                {id}
              </span>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        <div className="flex items-center justify-end text-xs text-ois-text-subtle font-medium">
          {isExpanded ? (
            <span className="flex items-center gap-1"><ChevronUp size={13} /> Collapse</span>
          ) : (
            <span className="flex items-center gap-1"><ChevronDown size={13} /> Expand</span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
          <MetricExpandedDetail metric={metric} />
        </div>
      )}
    </div>
  );
};
