import React from 'react';
import { EventType } from '../../types/monitoring';
import { eventTypeMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';
import * as LucideIcons from 'lucide-react';

interface EventTypeBadgeProps {
  type: EventType;
  className?: string;
  showIcon?: boolean;
}

export const EventTypeBadge: React.FC<EventTypeBadgeProps> = ({ type, className, showIcon = true }) => {
  const meta = eventTypeMeta[type];
  const Icon = (LucideIcons as any)[meta.icon];
  
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
      {showIcon && Icon && <Icon size={10} />}
      {meta.label}
    </div>
  );
};
