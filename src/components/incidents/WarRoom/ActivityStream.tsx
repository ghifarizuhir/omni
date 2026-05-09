import React, { useEffect, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { IncidentTimelineEvent, IncidentEventKind } from '@/src/types/incident';
import { IncidentTimelineEntry } from '@/src/components/incidents/IncidentTimelineEntry';

interface ActivityStreamProps {
  events: IncidentTimelineEvent[];
  incidentId: string;
}

const FILTER_OPTIONS: { label: string; kinds: IncidentEventKind[] | 'all' }[] = [
  { label: 'All', kinds: 'all' },
  { label: 'Status', kinds: ['status_changed', 'major_declared', 'escalated', 'resolved', 'reopened', 'closed'] },
  { label: 'Comments', kinds: ['comment_added', 'comms_posted'] },
  { label: 'System', kinds: ['created', 'assigned', 'sla_warning', 'sla_breached'] },
  { label: 'CI/Links', kinds: ['ci_linked', 'ci_unlinked', 'problem_linked', 'event_linked'] },
  { label: 'Comms', kinds: ['comms_posted'] },
];

export const ActivityStream: React.FC<ActivityStreamProps> = ({ events, incidentId }) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredEvents = (() => {
    const option = FILTER_OPTIONS.find(o => o.label === activeFilter);
    if (!option || option.kinds === 'all') return events;
    return events.filter(e => (option.kinds as IncidentEventKind[]).includes(e.kind));
  })();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ois-border bg-ois-bg shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ois-text uppercase tracking-widest">Activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ois-danger animate-pulse" />
          <span className="text-[11px] font-semibold text-ois-danger uppercase tracking-widest">Live</span>
          <Radio size={11} className="text-ois-danger ml-0.5" />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1 px-4 py-2 border-b border-ois-border overflow-x-auto scrollbar-none shrink-0 bg-ois-surface-muted/40">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => setActiveFilter(opt.label)}
            className={cn(
              'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors',
              activeFilter === opt.label
                ? 'bg-ois-primary text-white'
                : 'bg-white text-ois-text-muted hover:bg-ois-border border border-ois-border'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0 custom-scrollbar">
        {filteredEvents.length === 0 ? (
          <p className="text-xs text-ois-text-subtle text-center py-8">No events match this filter.</p>
        ) : (
          filteredEvents.map((event, idx) => (
            <IncidentTimelineEntry
              key={event.id}
              event={event}
              isLast={idx === filteredEvents.length - 1}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
