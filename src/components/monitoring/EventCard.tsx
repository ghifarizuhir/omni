import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, MessageSquare, Shield, Clock, PlusCircle } from 'lucide-react';
import { Event, EventStatus, EventSource } from '../../types/monitoring';
import { eventTypeMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { EventStatusBadge } from './EventStatusBadge';
import { EventTypeBadge } from './EventTypeBadge';
import { formatDistanceToNow } from 'date-fns';
import { IDCell } from '@/src/components/ui/IDCell';
import { StatusRing, type RingState } from '@/src/components/ui/StatusRing';
import { Dot, type DotVariant } from '@/src/components/ui/Dot';
import { SeverityStripeRow, type StripeSeverity } from '@/src/components/ui/SeverityStripe';

const EVENT_STATUS_TO_RING: Record<EventStatus, RingState> = {
  open:         'open',
  acknowledged: 'acknowledged',
  resolved:     'resolved',
  suppressed:   'closed',
};

const EVENT_SOURCE_TO_DOT: Record<EventSource, DotVariant> = {
  prometheus:     'info',
  opentelemetry:  'info',
  log_pattern:    'muted',
  synthetic:      'warning',
  webhook:        'muted',
  cicd:           'warning',
  cloud_provider: 'info',
  manual:         'muted',
};

interface EventCardProps {
  event: Event;
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({ event, className }) => {
  const navigate = useNavigate();
  const typeMeta = eventTypeMeta[event.type];

  const handleCardClick = () => {
    navigate(`/monitoring/events/${event.publicId}`);
  };

  const stopProp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <SeverityStripeRow
      severity={event.severity as StripeSeverity}
      onClick={handleCardClick}
      className={cn(
        "group relative flex items-stretch bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:border-ois-primary/40 transition-all cursor-pointer overflow-hidden",
        className
      )}
    >
      <div className="flex-1 px-4 py-3 flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <StatusRing state={EVENT_STATUS_TO_RING[event.status] ?? 'open'} />
            <Dot
              variant={EVENT_SOURCE_TO_DOT[event.source] ?? 'muted'}
              size="sm"
              aria-label={`Source: ${event.source}`}
            />
            <span onClick={stopProp}><IDCell value={event.publicId} /></span>
            <span className="text-ois-border-strong">·</span>
            <span className="flex items-center gap-1 text-xs text-ois-text-subtle">
              <Clock size={11} /> {formatDistanceToNow(new Date(event.firedAt))} ago
            </span>
          </div>

          <h3 className="text-sm font-semibold text-ois-text group-hover:text-ois-primary transition-colors leading-snug truncate">
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            <EventStatusBadge status={event.status} />
            <EventTypeBadge type={event.type} />

            {event.affectedCIIds.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-ois-badge bg-ois-primary-pale text-ois-primary text-[10px] font-medium">
                <Shield size={10} /> {event.affectedCIIds.length} CI{event.affectedCIIds.length > 1 ? 's' : ''}
              </span>
            )}

            {event.linkedIncidentId && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-ois-badge bg-ois-danger-pale text-ois-danger text-[10px] font-medium">
                <ExternalLink size={10} /> {event.linkedIncidentId}
              </span>
            )}
          </div>
        </div>

        {/* Actions rail */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={stopProp}>
          {event.status === 'open' && (
            <button className="px-3 py-1.5 bg-ois-primary text-white text-xs font-medium rounded-ois-btn hover:bg-ois-primary-hover transition-colors">
              Acknowledge
            </button>
          )}
          {event.status === 'acknowledged' && (
            <button className="px-3 py-1.5 bg-ois-success text-white text-xs font-medium rounded-ois-btn hover:opacity-90 transition-opacity">
              Resolve
            </button>
          )}
          {(event.status === 'open' || event.status === 'acknowledged') && !event.linkedIncidentId && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/incidents'); }}
              className="flex items-center gap-1 text-[11px] font-medium text-ois-danger hover:bg-ois-danger-pale px-2 py-1.5 rounded-ois-btn transition-colors"
            >
              <PlusCircle size={11} /> Create incident
            </button>
          )}
          <button className="p-1.5 text-ois-text-subtle hover:text-ois-text hover:bg-ois-surface-muted rounded-md transition-colors">
            <MessageSquare size={15} />
          </button>
          <button className="p-1.5 text-ois-text-subtle hover:text-ois-text hover:bg-ois-surface-muted rounded-md transition-colors">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>
    </SeverityStripeRow>
  );
};
