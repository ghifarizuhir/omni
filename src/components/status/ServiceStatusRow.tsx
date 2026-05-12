import React from 'react';
import { StatusPageEntry } from '@/src/types/platform';
import { statusPageStatusMeta } from '@/src/lib/constants';
import { UptimeHistoryBar } from './UptimeHistoryBar';

interface ServiceStatusRowProps {
  entry: StatusPageEntry;
}

export const ServiceStatusRow: React.FC<ServiceStatusRowProps> = ({ entry }) => {
  const meta = statusPageStatusMeta[entry.status];

  const updatedAt = new Date(entry.lastUpdatedAt).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });

  return (
    <div className="px-5 py-4">
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full mt-0.5"
              style={{ backgroundColor: meta.dot }}
            />
            <span className="truncate text-sm font-semibold text-ois-text">{entry.serviceName}</span>
          </div>
          {entry.serviceDescription && (
            <p className="mt-0.5 pl-[18px] text-xs text-ois-text-muted">{entry.serviceDescription}</p>
          )}
          {entry.statusMessage && (
            <p className="mt-1 pl-[18px] text-xs font-medium" style={{ color: meta.color }}>
              {entry.statusMessage}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>
      </div>

      {/* Uptime bar */}
      <div className="mt-3 pl-[18px]">
        <div className="mb-1 flex items-center justify-between text-xs text-ois-text-subtle">
          <span>90 days ago</span>
          <span>Today</span>
        </div>
        <UptimeHistoryBar uptime90d={entry.uptime90d} serviceId={entry.serviceId} />
        <p className="mt-1 text-right text-xs text-ois-text-subtle">
          Updated {updatedAt}
          {entry.lastUpdatedByName ? ` · ${entry.lastUpdatedByName}` : ''}
        </p>
      </div>
    </div>
  );
};
