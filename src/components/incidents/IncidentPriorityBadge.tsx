import React from 'react';
import { cn } from '@/src/lib/utils';
import { incidentPriorityMeta } from '@/src/lib/constants';
import { IncidentPriority } from '@/src/types/incident';

interface Props {
  priority: IncidentPriority;
  className?: string;
}

export const IncidentPriorityBadge: React.FC<Props> = ({ priority, className }) => {
  const meta = incidentPriorityMeta[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-8 h-5 rounded text-[11px] font-bold border',
        className
      )}
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  );
};
