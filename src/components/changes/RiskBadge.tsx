import React from 'react';
import { cn } from '../../lib/utils';
import { riskMeta } from '../../lib/constants';
import { RiskLevel } from '../../types/change';

interface RiskBadgeProps {
  risk: RiskLevel;
  score?: number;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk, score, size = 'md' }) => {
  const meta = riskMeta[risk];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-semibold',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
      )}
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
};
