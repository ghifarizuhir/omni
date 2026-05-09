import { cn } from '../../lib/utils';
import { CapacityThresholdSeverity } from '../../types';
import { capacityThresholdSeverityMeta } from '../../lib/constants';

interface ThresholdSeverityPillProps {
  severity: CapacityThresholdSeverity;
  size?: 'sm' | 'md';
}

export function ThresholdSeverityPill({ severity, size = 'md' }: ThresholdSeverityPillProps) {
  const meta = capacityThresholdSeverityMeta[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm',
      )}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}
