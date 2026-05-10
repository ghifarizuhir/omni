import React from 'react';
import { ImprovementPriority } from '../../types/improvement';
import { improvementPriorityMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface ImprovementPriorityDotProps {
  priority: ImprovementPriority;
  showLabel?: boolean;
  className?: string;
}

export function ImprovementPriorityDot({ priority, showLabel, className }: ImprovementPriorityDotProps) {
  const meta = improvementPriorityMeta[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
      {showLabel && <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>}
    </span>
  );
}
