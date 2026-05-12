import React from 'react';
import { Megaphone } from 'lucide-react';
import { StatusPageIncident } from '@/src/types/platform';
import { StatusUpdateEntry } from './StatusUpdateEntry';

const incidentStatusMeta: Record<
  StatusPageIncident['status'],
  { label: string; color: string; bg: string; dot: string }
> = {
  investigating: { label: 'Investigating', color: '#B54708', bg: '#FFFAEB', dot: '#F79009' },
  identified:    { label: 'Identified',    color: '#026AA2', bg: '#F0F9FF', dot: '#0BA5EC' },
  monitoring:    { label: 'Monitoring',    color: '#027A48', bg: '#ECFDF3', dot: '#12B76A' },
  resolved:      { label: 'Resolved',      color: '#344054', bg: '#F2F4F7', dot: '#98A2B3' },
};

interface StatusIncidentCardProps {
  incident: StatusPageIncident;
}

export const StatusIncidentCard: React.FC<StatusIncidentCardProps> = ({ incident }) => {
  const meta = incidentStatusMeta[incident.status];

  const startedAt = new Date(incident.startedAt).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });

  const sortedUpdates = [...incident.updates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card overflow-hidden">
      {/* Incident header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Megaphone size={15} className="text-ois-text-muted shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ois-text truncate">{incident.title}</h3>
            <p className="mt-0.5 text-xs text-ois-text-muted">Started {startedAt}</p>
          </div>
        </div>
        <span
          className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
          {meta.label}
        </span>
      </div>

      {/* Updates timeline */}
      {sortedUpdates.length > 0 && (
        <div className="border-t border-ois-border bg-ois-bg/40 px-5 py-4 space-y-4">
          {sortedUpdates.map(u => (
            <StatusUpdateEntry key={u.id} update={u} />
          ))}
        </div>
      )}
    </div>
  );
};
