import React from 'react';
import { cn } from '@/src/lib/utils';
import { biaImpactLevelMeta } from '@/src/lib/constants';
import { BIAImpactLevel } from '@/src/types/continuity';

interface Props {
  level: BIAImpactLevel;
  className?: string;
}

export const BIAImpactLevelPill: React.FC<Props> = ({ level, className }) => {
  const meta = biaImpactLevelMeta[level];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
};
