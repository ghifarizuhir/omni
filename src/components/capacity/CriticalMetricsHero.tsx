import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { CapacityMetric } from '../../types';
import { UtilizationBar } from './UtilizationBar';
import { useToast, ToastView } from '../../lib/useToast';

interface CriticalMetricsHeroProps {
  metrics: CapacityMetric[];
  onViewMetric?: (id: string) => void;
}

function getBgColor(util: number, warning: number, critical: number): string {
  if (util >= critical) return '#FEF3F2';
  return '#FFFAEB';
}

function getBorderColor(util: number, warning: number, critical: number): string {
  if (util >= critical) return '#F04438';
  return '#F79009';
}

function getTextColor(util: number, warning: number, critical: number): string {
  if (util >= critical) return '#B42318';
  return '#B54708';
}

function getSeverityLabel(util: number, warning: number, critical: number): string {
  if (util >= critical) return 'CRITICAL';
  return 'WARNING';
}

function getThresholdLabel(util: number, warning: number, critical: number): string {
  if (util >= critical) return `exceeded critical threshold (${critical}%)`;
  return `at or near warning threshold (${warning}%)`;
}

export function CriticalMetricsHero({ metrics, onViewMetric }: CriticalMetricsHeroProps) {
  const sorted = [...metrics].sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const { toast, showToast } = useToast();

  const handleAcknowledge = (metric: CapacityMetric) => {
    setAcknowledged(prev => new Set(prev).add(metric.id));
    showToast(`Acknowledged ${metric.publicId}`, 'success');
  };

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-sm font-semibold text-amber-800">
          ATTENTION REQUIRED — {sorted.length} metric{sorted.length !== 1 ? 's' : ''} at or near threshold
        </p>
      </div>

      {/* Metric rows */}
      <div className="space-y-2">
        {sorted.map(metric => {
          const bg = getBgColor(metric.utilizationPercent, metric.warningThreshold, metric.criticalThreshold);
          const borderColor = getBorderColor(metric.utilizationPercent, metric.warningThreshold, metric.criticalThreshold);
          const textColor = getTextColor(metric.utilizationPercent, metric.warningThreshold, metric.criticalThreshold);
          const severityLabel = getSeverityLabel(metric.utilizationPercent, metric.warningThreshold, metric.criticalThreshold);
          const thresholdLabel = getThresholdLabel(metric.utilizationPercent, metric.warningThreshold, metric.criticalThreshold);

          return (
            <div
              key={metric.id}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor, backgroundColor: bg }}
            >
              <div className="px-4 py-3 space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs" style={{ color: textColor }}>
                      {metric.publicId}
                    </span>
                    <p className="text-sm font-semibold text-gray-900">{metric.name}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: textColor }}>
                    {metric.utilizationPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <UtilizationBar
                  value={metric.utilizationPercent}
                  warningThreshold={metric.warningThreshold}
                  criticalThreshold={metric.criticalThreshold}
                  showLabel
                />

                {/* Severity line */}
                <p className="text-xs font-medium" style={{ color: textColor }}>
                  {severityLabel} — {thresholdLabel}
                </p>

                {/* Actions row */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {onViewMetric && (
                    <button
                      onClick={() => onViewMetric(metric.id)}
                      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ borderColor, color: textColor }}
                    >
                      View metric →
                    </button>
                  )}
                  {acknowledged.has(metric.id) ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <Check size={12} /> Acknowledged
                    </span>
                  ) : (
                    <button
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      onClick={() => handleAcknowledge(metric)}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ToastView toast={toast} />
    </div>
  );
}
