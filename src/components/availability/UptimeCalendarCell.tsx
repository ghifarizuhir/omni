import { cn } from '../../lib/utils';
import { dailyHealthColors } from '../../lib/constants';
import { DailyServiceHealth } from '../../types';

interface UptimeCalendarCellProps {
  health: DailyServiceHealth;
  isToday: boolean;
  size: 'compact' | 'default';
  onHover: (health: DailyServiceHealth | null) => void;
  onClick: () => void;
}

export function UptimeCalendarCell({
  health,
  isToday,
  size,
  onHover,
  onClick,
}: UptimeCalendarCellProps) {
  const color = dailyHealthColors[health.status] ?? '#E5E7EB';
  const dimensions = size === 'compact'
    ? { width: 8, height: 10 }
    : { width: 12, height: 16 };

  return (
    <div
      className={cn(
        'cursor-pointer rounded-sm transition-opacity hover:opacity-75',
        isToday && 'ring-2 ring-blue-400 ring-offset-1',
      )}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: color,
        flexShrink: 0,
      }}
      onMouseEnter={() => onHover(health)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    />
  );
}
