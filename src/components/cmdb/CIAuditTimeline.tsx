import React from 'react';
import { CIAuditEntry } from '../../types/ci';
import { CIAuditEntryCard } from './CIAuditEntry';
import { format } from 'date-fns';

interface CIAuditTimelineProps {
  entries: CIAuditEntry[];
  showCIInfo?: boolean;
}

export const CIAuditTimeline: React.FC<CIAuditTimelineProps> = ({ entries, showCIInfo = true }) => {
  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = format(new Date(entry.timestamp), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, CIAuditEntry[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8 relative">
      {/* Vertical line connecting icons */}
      <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-ois-border opacity-50 z-0" />

      {sortedDates.map(date => (
        <div key={date} className="space-y-4">
          <div className="relative pl-12">
             <div className="absolute left-[12px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-ois-border bg-white" />
             <h4 className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest">
               {format(new Date(date), 'MMMM d, yyyy')}
             </h4>
          </div>
          
          <div className="space-y-4">
            {groupedEntries[date].map(entry => (
              <CIAuditEntryCard key={entry.id} entry={entry} showCIInfo={showCIInfo} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
