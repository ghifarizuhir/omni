import React from 'react';
import { ExternalLink, CheckCircle2, Megaphone } from 'lucide-react';
import { IncidentTimelineEvent } from '@/src/types/incident';
import { formatDate, formatRelative } from '@/src/lib/format';

interface CommunicationLogProps {
  commsEvents: IncidentTimelineEvent[];
}

const AUDIENCE_LABEL: Record<string, string> = {
  all_staff: 'All staff',
  internal: 'IT only',
  customer: 'Customers (status page)',
};

const AUDIENCE_COLOR: Record<string, string> = {
  all_staff: '#0BA5EC',
  internal: '#6941C6',
  customer: '#067647',
};

export const CommunicationLog: React.FC<CommunicationLogProps> = ({ commsEvents }) => {
  const sorted = [...commsEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ois-border shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone size={14} className="text-ois-text-muted" />
          <span className="text-xs font-bold text-ois-text uppercase tracking-widest">
            Communications log
          </span>
          <span className="bg-ois-surface-muted text-ois-text-muted text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-ois-border">
            {commsEvents.length}
          </span>
        </div>
        <a
          href="/status"
          className="flex items-center gap-1 text-xs text-ois-primary hover:underline"
        >
          <ExternalLink size={11} />
          Status page
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Megaphone size={28} className="text-ois-text-subtle mb-3" />
            <p className="text-sm font-medium text-ois-text">No communications yet</p>
            <p className="text-xs text-ois-text-subtle mt-1">
              Post the first update using the composer below.
            </p>
          </div>
        ) : (
          sorted.map(event => {
            const audience = event.details?.commsAudience ?? 'internal';
            const color = AUDIENCE_COLOR[audience] ?? '#475467';
            return (
              <div key={event.id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ois-text">{event.actorName}</span>
                    <span className="text-xs text-ois-text-muted">→</span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                    >
                      {AUDIENCE_LABEL[audience] ?? audience}
                    </span>
                  </div>
                  <span className="text-[11px] text-ois-text-subtle shrink-0">
                    {formatRelative(event.timestamp)}
                  </span>
                </div>

                <div className="bg-ois-surface-muted rounded-lg p-3 border border-ois-border text-sm text-ois-text leading-relaxed">
                  {event.details?.commsBody ?? ''}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-ois-text-subtle">
                  <div className="flex items-center gap-1 text-ois-success">
                    <CheckCircle2 size={11} />
                    <span>Delivered</span>
                  </div>
                  <span className="text-ois-border">·</span>
                  <span>Channels: Slack #incidents, Email all-staff</span>
                  <span className="text-ois-border">·</span>
                  <span title={formatDate(event.timestamp)}>{formatDate(event.timestamp, 'HH:mm')} UTC</span>
                </div>

                <div className="border-b border-ois-border/50" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
