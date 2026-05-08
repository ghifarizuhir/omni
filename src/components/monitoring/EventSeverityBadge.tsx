import React from 'react';
import { Severity } from '../../types/common';
import { cn } from '../../lib/utils';

interface EventSeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const EventSeverityBadge: React.FC<EventSeverityBadgeProps> = ({ severity, className }) => {
  const styles: Record<Severity, string> = {
    P1: 'bg-ois-sev-p1 text-white border-ois-sev-p1',
    P2: 'bg-ois-sev-p2 text-white border-ois-sev-p2',
    P3: 'bg-amber-100 text-amber-700 border-amber-200',
    P4: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <span className={cn(
      "px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
      styles[severity],
      className
    )}>
      {severity}
    </span>
  );
};
