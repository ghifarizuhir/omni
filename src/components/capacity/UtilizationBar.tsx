import { cn } from '../../lib/utils';

interface UtilizationBarProps {
  value: number;
  warningThreshold: number;
  criticalThreshold: number;
  showLabel?: boolean;
  className?: string;
}

function getBarColor(value: number, warningThreshold: number, criticalThreshold: number): string {
  if (value >= criticalThreshold) return '#F04438';
  if (value >= warningThreshold) return '#F79009';
  return '#12B76A';
}

export function UtilizationBar({
  value,
  warningThreshold,
  criticalThreshold,
  showLabel = false,
  className,
}: UtilizationBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const color = getBarColor(value, warningThreshold, criticalThreshold);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-700 tabular-nums shrink-0" style={{ minWidth: '2.5rem' }}>
          {value.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
