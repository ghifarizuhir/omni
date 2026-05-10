import React from 'react';
import { cn } from '@/src/lib/utils';
import { drTestStatusMeta } from '@/src/lib/constants';
import { DRTestStatus } from '@/src/types/continuity';

interface Props {
  status: DRTestStatus;
  className?: string;
}

export const DRTestStatusPill: React.FC<Props> = ({ status, className }) => {
  const meta = drTestStatusMeta[status];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  );
};
