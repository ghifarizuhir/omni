import React from 'react';
import { Clock, CheckCircle2, User, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface TimelineEntry {
  timestamp: string;
  type: 'log' | 'status_change' | 'comment' | 'action' | 'system';
  user?: string;
  message: string;
  payload?: any;
}

interface EventTimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ entries, className }) => {
  return (
    <div className={cn("relative space-y-6", className)}>
      {/* Connector Line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-ois-border" />

      {entries.map((entry, i) => {
        const Icon = getIcon(entry.type);
        const iconColor = getIconColor(entry.type);

        return (
          <div key={i} className="relative pl-10">
            {/* Timeline Dot/Icon */}
            <div 
              className={cn(
                "absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white z-10",
                iconColor
              )}
            >
              <Icon size={14} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-ois-text">{entry.user || 'System'}</span>
                <span className="text-[11px] font-medium text-ois-text-subtle">
                  {format(new Date(entry.timestamp), 'MMM d, HH:mm:ss')}
                </span>
              </div>
              <p className="text-sm text-ois-text-muted">{entry.message}</p>
              {entry.payload && (
                <div className="mt-2 p-2 bg-ois-bg border border-ois-border rounded font-mono text-[10px] text-ois-text-subtle overflow-x-auto">
                  <pre>{JSON.stringify(entry.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function getIcon(type: string) {
  switch (type) {
    case 'status_change': return Zap;
    case 'comment': return CheckCircle2;
    case 'action': return User;
    case 'system': return ShieldCheck;
    default: return Clock;
  }
}

function getIconColor(type: string) {
  switch (type) {
    case 'status_change': return "bg-ois-warning-pale text-ois-warning";
    case 'action': return "bg-ois-primary-pale text-ois-primary";
    case 'system': return "bg-ois-success-pale text-ois-success";
    default: return "bg-ois-surface-muted text-ois-text-subtle";
  }
}
