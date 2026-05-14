import React from 'react';
import {
  Plus, UserPlus, UserMinus, ArrowUpDown, RefreshCw, MessageCircle,
  Link, Unlink, Radio, AlertTriangle, AlertOctagon,
  ArrowUpRight, Siren, Megaphone, CheckCheck, CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { IncidentTimelineEvent, IncidentEventKind } from '@/src/types/incident';
import { incidentEventKindMeta } from '@/src/lib/constants';
import { formatDate, formatRelative } from '@/src/lib/format';

const ICON_MAP: Record<IncidentEventKind, React.ComponentType<{ size?: number }>> = {
  created:          Plus,
  assigned:         UserPlus,
  priority_changed: ArrowUpDown,
  status_changed:   RefreshCw,
  comment_added:    MessageCircle,
  ci_linked:        Link,
  ci_unlinked:      Unlink,
  problem_linked:   Link,
  event_linked:     Radio,
  sla_warning:      AlertTriangle,
  sla_breached:     AlertOctagon,
  escalated:        ArrowUpRight,
  major_declared:   Siren,
  comms_posted:     Megaphone,
  resolution_added: CheckCheck,
  resolved:         CheckCircle2,
  reopened:         RefreshCw,
  closed:           XCircle,
  promoted_major:   Siren,
  linked:           Link,
  watcher_added:    UserPlus,
  watcher_removed:  UserMinus,
};

interface Props {
  event: IncidentTimelineEvent;
  isLast?: boolean;
}

export const IncidentTimelineEntry: React.FC<Props> = ({ event, isLast }) => {
  const meta = incidentEventKindMeta[event.kind];
  const IconComponent = ICON_MAP[event.kind] ?? Plus;

  const renderDetails = () => {
    const d = event.details;
    if (!d) return null;

    const parts: React.ReactNode[] = [];

    if (d.fromStatus && d.toStatus) {
      parts.push(
        <span key="status" className="flex items-center gap-1.5 text-xs text-ois-text-muted">
          <span className="font-medium capitalize">{d.fromStatus.replace('_', ' ')}</span>
          <span>→</span>
          <span className="font-medium capitalize">{d.toStatus.replace('_', ' ')}</span>
        </span>
      );
    }
    if (d.fromPriority && d.toPriority) {
      parts.push(
        <span key="priority" className="flex items-center gap-1.5 text-xs text-ois-text-muted">
          <span className="font-mono font-semibold">{d.fromPriority}</span>
          <span>→</span>
          <span className="font-mono font-semibold">{d.toPriority}</span>
        </span>
      );
    }
    if (d.assigneeName) {
      parts.push(
        <span key="assignee" className="text-xs text-ois-text-muted">
          Assigned to <span className="font-medium text-ois-text">{d.assigneeName}</span>
        </span>
      );
    }
    if (d.ciPublicId) {
      parts.push(
        <span key="ci" className="text-xs font-mono text-ois-primary">{d.ciPublicId}</span>
      );
    }
    if (d.eventPublicId) {
      parts.push(
        <span key="event" className="text-xs font-mono text-ois-primary">{d.eventPublicId}</span>
      );
    }
    if (d.problemPublicId) {
      parts.push(
        <span key="problem" className="text-xs font-mono text-ois-primary">{d.problemPublicId}</span>
      );
    }
    if (d.commsBody) {
      parts.push(
        <div key="comms" className="text-xs text-ois-text-muted bg-ois-surface-muted rounded p-2 border-l-2 border-amber-400">
          <span className="font-medium text-amber-700">
            {d.commsAudience === 'all_staff' ? 'All staff' : d.commsAudience === 'customer' ? 'Customers' : 'Internal'}
          </span>
          {': '}
          {d.commsBody}
        </div>
      );
    }
    if (d.note && !d.commsBody) {
      parts.push(
        <p key="note" className="text-xs text-ois-text-muted italic">"{d.note}"</p>
      );
    }

    return parts.length > 0 ? (
      <div className="mt-1 space-y-1">{parts}</div>
    ) : null;
  };

  return (
    <div className="flex gap-3">
      {/* Left: dot + line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 bg-white"
          style={{ borderColor: meta.color }}
        >
          <IconComponent size={13} style={{ color: meta.color }} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-ois-border mt-1" />}
      </div>

      {/* Right: content */}
      <div className={cn('pb-5 flex-1 min-w-0', isLast && 'pb-0')}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-ois-text">{meta.label}</span>
          <span
            className="text-[11px] text-ois-text-subtle shrink-0"
            title={formatDate(event.timestamp)}
          >
            {formatDate(event.timestamp, 'HH:mm')} UTC · {formatRelative(event.timestamp)}
          </span>
        </div>
        <p className="text-xs text-ois-text-muted mt-0.5">
          {event.actorId === 'system' ? (
            <span className="italic">{event.actorName}</span>
          ) : (
            event.actorName
          )}
        </p>
        {renderDetails()}
      </div>
    </div>
  );
};
