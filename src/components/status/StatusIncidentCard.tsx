import React from 'react';
import { StatusPageIncident } from '@/src/types/platform';
import { StatusUpdateEntry } from './StatusUpdateEntry';

const incidentStatusMeta: Record<
  StatusPageIncident['status'],
  { label: string; color: string; bg: string }
> = {
  investigating: { label: 'Investigating', color: '#B54708', bg: '#FFFAEB' },
  identified:    { label: 'Identified',    color: '#026AA2', bg: '#F0F9FF' },
  monitoring:    { label: 'Monitoring',    color: '#027A48', bg: '#ECFDF3' },
  resolved:      { label: 'Resolved',      color: '#344054', bg: '#F2F4F7' },
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

  // Sort updates newest first
  const sortedUpdates = [...incident.updates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📢</span>
          <h3 className="font-semibold text-gray-900">{incident.title}</h3>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>
      </div>
      <p className="mt-1 pl-7 text-xs text-gray-500">Started {startedAt}</p>

      {/* Updates timeline */}
      {sortedUpdates.length > 0 && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 pl-1">
          {sortedUpdates.map(u => (
            <StatusUpdateEntry key={u.id} update={u} />
          ))}
        </div>
      )}
    </div>
  );
};
