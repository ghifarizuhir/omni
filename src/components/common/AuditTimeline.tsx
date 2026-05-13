import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatRelative } from '../../lib/format';

export interface AuditEntry {
  id: string;
  timestamp: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  actor: string;
  action: string;
  detail?: string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  emptyLabel?: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  entries,
  emptyLabel = 'No history yet.',
}) => {
  if (entries.length === 0) {
    return <p className="text-sm text-ois-text-subtle italic">{emptyLabel}</p>;
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <ol className="relative ml-4 border-l border-ois-border space-y-4 py-1">
      {sorted.map(entry => {
        const Icon = entry.icon;
        return (
          <li key={entry.id} className="ml-6 relative">
            <span
              className="absolute -left-[34px] top-0 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-ois-surface"
              style={{ backgroundColor: entry.iconBg, color: entry.iconColor }}
            >
              <Icon size={12} />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-ois-text">
                <span className="font-semibold">{entry.actor}</span>{' '}
                <span className="text-ois-text-muted">{entry.action}</span>
              </p>
              {entry.detail && (
                <p className="text-xs text-ois-text-muted">{entry.detail}</p>
              )}
              <p className="text-[11px] text-ois-text-subtle">
                {formatRelative(entry.timestamp)} ·{' '}
                <span className="font-mono">
                  {new Date(entry.timestamp).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};
