import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface FlakyTestBadgeProps {
  flakeRate: number;
}

export const FlakyTestBadge: React.FC<FlakyTestBadgeProps> = ({ flakeRate }) => {
  if (!flakeRate) return null;

  const isHigh = flakeRate >= 0.15;
  const color = isHigh ? '#B42318' : '#DC6803';
  const bg = isHigh ? '#FEF3F2' : '#FFFAEB';
  const pct = Math.round(flakeRate * 100);

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
      style={{ color, background: bg }}
    >
      <AlertTriangle size={10} />
      {pct}% flake
    </span>
  );
};
