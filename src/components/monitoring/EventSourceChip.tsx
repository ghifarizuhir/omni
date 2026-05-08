import React from 'react';
import { EventSource } from '../../types/monitoring';
import { eventSourceMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';
import * as LucideIcons from 'lucide-react';

interface EventSourceChipProps {
  source: EventSource;
  className?: string;
  showIcon?: boolean;
}

export const EventSourceChip: React.FC<EventSourceChipProps> = ({ source, className, showIcon = true }) => {
  const meta = eventSourceMeta[source] || { label: source, icon: 'Globe' };
  const Icon = (LucideIcons as any)[meta.icon];
  
  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ois-bg border border-ois-border text-[10px] font-bold text-ois-text-muted uppercase",
        className
      )}
    >
      {showIcon && Icon && <Icon size={10} />}
      {meta.label}
    </div>
  );
};
