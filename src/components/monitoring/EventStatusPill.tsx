import React from 'react';
import { EventStatus } from '../../types/monitoring';
import { eventStatusMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface EventStatusPillProps {
  status: EventStatus;
  className?: string;
}

export const EventStatusPill: React.FC<EventStatusPillProps> = ({ status, className }) => {
  const meta = eventStatusMeta[status] || { label: status, color: '#000', bg: '#eee' };

  return (
    <span 
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
        className
      )}
      style={{ 
        backgroundColor: meta.bg, 
        color: meta.color,
        border: `1px solid ${meta.color}20`
      }}
    >
      {meta.label}
    </span>
  );
};
