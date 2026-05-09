import { Check } from 'lucide-react';
import { CapacityThreshold } from '../../types';
import { ThresholdSeverityPill } from './ThresholdSeverityPill';

interface ThresholdRowProps {
  threshold: CapacityThreshold;
  onToggle?: (id: string, enabled: boolean) => void;
}

export function ThresholdRow({ threshold, onToggle }: ThresholdRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-sm">
      {/* Public ID */}
      <span className="font-mono text-xs text-gray-400 w-32 shrink-0">{threshold.publicId}</span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{threshold.name}</p>
        <p className="text-xs text-gray-500 truncate">{threshold.metricName}</p>
      </div>

      {/* Severity */}
      <div className="w-20 shrink-0">
        <ThresholdSeverityPill severity={threshold.severity} size="sm" />
      </div>

      {/* Threshold value */}
      <div className="w-24 shrink-0 text-xs text-gray-700">
        <span className="font-mono">
          {threshold.operator} {threshold.thresholdValue}
          {threshold.metricName.toLowerCase().includes('%') || threshold.metricName.toLowerCase().includes('cpu') || threshold.metricName.toLowerCase().includes('mem') ? '%' : ''}
        </span>
      </div>

      {/* Duration */}
      <div className="w-20 shrink-0 text-xs text-gray-500">
        {threshold.durationMinutes}m
      </div>

      {/* Auto-scale */}
      <div className="w-16 shrink-0 text-xs text-center">
        {threshold.autoScalingEnabled ? (
          <Check className="h-4 w-4 text-green-500 mx-auto" />
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </div>

      {/* Triggers (30d) */}
      <div className="w-16 shrink-0 text-xs text-gray-600 text-center">
        {threshold.triggerCount30d}
      </div>

      {/* Enabled toggle */}
      <div className="w-12 shrink-0 flex justify-center">
        <button
          role="switch"
          aria-checked={threshold.enabled}
          onClick={() => onToggle?.(threshold.id, !threshold.enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            threshold.enabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              threshold.enabled ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
