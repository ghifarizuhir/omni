import React from 'react';
import { MetricDefinition } from '@/src/types/measurement';
import { MetricTrendMiniChart } from './MetricTrendMiniChart';

interface MetricExpandedDetailProps {
  metric: MetricDefinition;
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

function getInterpretation(metric: MetricDefinition): string {
  const name = metric.name.toLowerCase();
  if (name.includes('mttr')) return '< 30 min = Elite · 30 min–2h = High · 2–8h = Medium · >8h = Low';
  if (name.includes('mtbf')) return '> 30 days = Elite · 14–30 days = High · 7–14 days = Medium · <7 days = Low';
  if (name.includes('availability') || name.includes('uptime')) return '> 99.9% = Elite · 99.5–99.9% = High · 99–99.5% = Medium · <99% = Low';
  if (name.includes('change_success') || name.includes('success_rate')) return '> 95% = Elite · 85–95% = High · 75–85% = Medium · <75% = Low';
  if (name.includes('error_budget')) return '> 50% remaining = Healthy · 10–50% = At risk · <10% = Critical';
  return 'Higher values indicate better performance for this metric.';
}

function getHistoricalRows(currentValue: number, unit: string) {
  const months = ['May 2026', 'Apr 2026', 'Mar 2026', 'Feb 2026'];
  const deltas = [0, -5, 3, -8]; // percent deltas relative to current
  return months.map((month, i) => ({
    month,
    value: formatValue(currentValue * (1 + deltas[i] / 100), unit),
  }));
}

export const MetricExpandedDetail: React.FC<MetricExpandedDetailProps> = ({ metric }) => {
  const history = getHistoricalRows(metric.currentValue ?? 0, metric.unit);

  return (
    <div className="flex flex-col gap-4 pt-4 mt-4 border-t border-ois-border">
      {/* Formula */}
      {metric.formula && (
        <div>
          <h4 className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Full Formula</h4>
          <p className="font-mono text-xs text-ois-text bg-ois-surface-muted rounded-lg px-3 py-2">
            {metric.formula}
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <h4 className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Description</h4>
        <p className="text-sm text-ois-text-subtle leading-relaxed">{metric.description}</p>
      </div>

      {/* Interpretation */}
      <div>
        <h4 className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Interpretation</h4>
        <p className="text-sm text-ois-text-subtle">{getInterpretation(metric)}</p>
        {metric.currentValue !== undefined && (
          <p className="mt-1 text-sm font-semibold text-ois-text">
            Current: {formatValue(metric.currentValue, metric.unit)}
          </p>
        )}
      </div>

      {/* Trend chart */}
      {metric.currentValue !== undefined && (
        <div>
          <h4 className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Trend (30d)</h4>
          <MetricTrendMiniChart metricId={metric.id} currentValue={metric.currentValue} />
        </div>
      )}

      {/* History table */}
      {metric.currentValue !== undefined && (
        <div>
          <h4 className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider mb-1">History</h4>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-ois-border">
              {history.map((row) => (
                <tr key={row.month}>
                  <td className="py-1.5 text-ois-text-subtle text-xs">{row.month}</td>
                  <td className="py-1.5 text-right font-mono text-xs text-ois-text">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Used in */}
      {(metric.usedInDashboardIds.length > 0 || metric.usedInReportIds.length > 0) && (
        <div>
          <h4 className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider mb-1">Used In</h4>
          <ul className="flex flex-col gap-0.5">
            {metric.usedInDashboardIds.map((id) => (
              <li key={id} className="text-xs text-ois-text-subtle">• Dashboard: {id}</li>
            ))}
            {metric.usedInReportIds.map((id) => (
              <li key={id} className="text-xs text-ois-text-subtle">• Report: {id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
