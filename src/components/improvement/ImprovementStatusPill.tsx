import React from 'react';
import { ImprovementStatus } from '../../types/improvement';
import { improvementStatusMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface ImprovementStatusPillProps {
  status: ImprovementStatus;
  className?: string;
}

export function ImprovementStatusPill({ status, className }: ImprovementStatusPillProps) {
  const meta = improvementStatusMeta[status];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  );
}
