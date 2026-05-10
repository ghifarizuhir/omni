import React from 'react';
import { cn } from '../../lib/utils';

interface TestPassRateBarProps {
  rate: number;
  showLabel?: boolean;
}

export const TestPassRateBar: React.FC<TestPassRateBarProps> = ({ rate, showLabel = false }) => {
  const pct = Math.round(rate * 100);
  const color = rate >= 0.95 ? '#12B76A' : rate >= 0.80 ? '#F79009' : '#F04438';

  return (
    <div className={cn('flex items-center gap-2', showLabel && 'min-w-0')}>
      <div className="h-1.5 flex-1 rounded-full bg-[#F1F3F7] overflow-hidden min-w-[48px]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color }}>
          {pct}%
        </span>
      )}
    </div>
  );
};
