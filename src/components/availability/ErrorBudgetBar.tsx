import { cn } from '../../lib/utils';

interface ErrorBudgetBarProps {
  consumed: number;
  total: number;
  remainingPercent: number;
  showLabels?: boolean;
}

function getBarColor(consumedPct: number): string {
  if (consumedPct > 100) return '#F04438';
  if (consumedPct > 80) return '#FB923C';
  if (consumedPct > 50) return '#F79009';
  return '#12B76A';
}

export function ErrorBudgetBar({
  consumed,
  total,
  remainingPercent,
  showLabels = true,
}: ErrorBudgetBarProps) {
  const consumedPct = total > 0 ? (consumed / total) * 100 : 0;
  const isExhausted = consumedPct > 100;
  const barWidth = Math.min(consumedPct, 100);
  const barColor = getBarColor(consumedPct);
  const remaining = total - consumed;

  return (
    <div className="w-full space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${barWidth}%`, backgroundColor: barColor }}
        />
        {isExhausted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-red-700">
              Exhausted
            </span>
          </div>
        )}
      </div>
      {showLabels && (
        <p className={cn('text-xs', isExhausted ? 'text-red-600' : 'text-gray-500')}>
          {consumed.toFixed(1)} of {total.toFixed(1)} min consumed
          {' · '}
          {isExhausted
            ? `${Math.abs(remaining).toFixed(1)} min overrun (${Math.abs(remainingPercent).toFixed(0)}% over)`
            : `${remaining.toFixed(1)} min remaining (${remainingPercent.toFixed(0)}%)`}
        </p>
      )}
    </div>
  );
}
