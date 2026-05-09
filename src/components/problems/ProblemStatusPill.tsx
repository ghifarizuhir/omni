import React from 'react';
import { cn } from '@/src/lib/utils';
import { problemStatusMeta } from '@/src/lib/constants';
import { ProblemStatus } from '@/src/types/problem';

interface Props {
  status: ProblemStatus;
  className?: string;
}

export const ProblemStatusPill: React.FC<Props> = ({ status, className }) => {
  const meta = problemStatusMeta[status];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', className)}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  );
};
