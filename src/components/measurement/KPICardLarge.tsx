import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface KPICardLargeProps {
  title: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  target?: string;
  status?: 'good' | 'warning' | 'bad';
}

const statusBorder: Record<NonNullable<KPICardLargeProps['status']>, string> = {
  good:    'border-t-4 border-t-[#12B76A]',
  warning: 'border-t-4 border-t-[#F79009]',
  bad:     'border-t-4 border-t-[#F04438]',
};

export const KPICardLarge: React.FC<KPICardLargeProps> = ({
  title,
  value,
  subtext,
  trend,
  trendLabel,
  target,
  status,
}) => {
  const trendColor =
    trend === 'up'
      ? 'text-[#12B76A]'
      : trend === 'down'
      ? 'text-[#F04438]'
      : 'text-ois-text-subtle';

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-5 flex flex-col gap-2',
        status ? statusBorder[status] : 'border-t-4 border-t-transparent',
      )}
    >
      <span className="text-xs font-semibold text-ois-text-muted uppercase tracking-wider">{title}</span>
      <div className="text-3xl font-bold text-ois-text leading-tight">{value}</div>

      {(trend || trendLabel) && (
        <div className={cn('flex items-center gap-1 text-xs font-semibold', trendColor)}>
          <TrendIcon size={13} />
          {trendLabel && <span>{trendLabel}</span>}
        </div>
      )}

      {subtext && <p className="text-xs text-ois-text-subtle">{subtext}</p>}

      {target && (
        <p className="text-[11px] text-ois-text-muted font-medium uppercase tracking-wide">
          Target: {target}
        </p>
      )}
    </div>
  );
};
