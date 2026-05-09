import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrendIndicatorProps {
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  size?: 'sm' | 'md';
}

export function TrendIndicator({ trend, changePercent, size = 'md' }: TrendIndicatorProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (trend === 'increasing') {
    return (
      <span className={cn('inline-flex items-center gap-1 font-medium', textSize, 'text-red-600')}>
        <TrendingUp className={iconSize} />
        +{changePercent}%
      </span>
    );
  }

  if (trend === 'decreasing') {
    return (
      <span className={cn('inline-flex items-center gap-1 font-medium', textSize, 'text-green-600')}>
        <TrendingDown className={iconSize} />
        -{changePercent}%
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', textSize, 'text-gray-500')}>
      <Minus className={iconSize} />
      ±{changePercent}%
    </span>
  );
}
