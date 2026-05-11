import React from 'react';
import { cn } from '@/src/lib/utils';
import { incidentPriorityMeta } from '@/src/lib/constants';
import { IncidentPriority } from '@/src/types/incident';

interface Props {
  priority: IncidentPriority;
  urgent?: boolean;
  className?: string;
}

export const IncidentPriorityBadge: React.FC<Props> = ({ priority, urgent, className }) => {
  const meta = incidentPriorityMeta[priority];
  const showPulse = priority === 'P1' || urgent === true;

  const badgeStyle: React.CSSProperties =
    priority === 'P1' || priority === 'P2'
      ? { backgroundColor: meta.color, color: '#FFFFFF', borderColor: 'transparent' }
      : { backgroundColor: meta.bg, color: meta.color, borderColor: meta.border + '60' };

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      {showPulse && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded animate-ping opacity-40"
          style={{ backgroundColor: meta.border }}
        />
      )}
      <span
        className="relative inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded border"
        style={badgeStyle}
      >
        {meta.label}
      </span>
    </span>
  );
};
