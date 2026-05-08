import React from 'react';
import { EventStatus } from '../../types/monitoring';
import { eventStatusMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
  showDot?: boolean;
}

export const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({ status, className, showDot = true }) => {
  const meta = eventStatusMeta[status];
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
        className
      )}
      style={{ 
        backgroundColor: meta.bg, 
        color: meta.color,
        borderColor: `${meta.color}20` 
      }}
    >
      {showDot && (
        <div 
          className="w-1.5 h-1.5 rounded-full" 
          style={{ backgroundColor: meta.dot }} 
        />
      )}
      {meta.label}
    </div>
  );
};
