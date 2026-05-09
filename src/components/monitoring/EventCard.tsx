import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ExternalLink, MessageSquare, Shield, Clock } from 'lucide-react';
import { Event } from '../../types/monitoring';
import { eventTypeMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { EventStatusBadge } from './EventStatusBadge';
import { EventTypeBadge } from './EventTypeBadge';
import { EventSourceChip } from './EventSourceChip';
import { formatDistanceToNow } from 'date-fns';

interface EventCardProps {
  event: Event;
  className?: string;
}

export const EventCard: React.FC<EventCardProps> = ({ event, className }) => {
  const navigate = useNavigate();
  const typeMeta = eventTypeMeta[event.type];

  const handleCardClick = () => {
    navigate(`/events/${event.publicId}`);
  };

  const stopProp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      onClick={handleCardClick}
      className={cn(
        "group relative flex items-stretch bg-white border border-ois-border rounded-lg shadow-sm hover:shadow-md hover:border-ois-primary/30 transition-all cursor-pointer overflow-hidden",
        className
      )}
    >
      {/* Severity Stripe */}
      <div 
        className="w-1.5 flex-shrink-0" 
        style={{ backgroundColor: typeMeta.color }}
      />

      <div className="flex-1 p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-ois-text-subtle">
            <span className="hover:text-ois-primary transition-colors" onClick={stopProp}>{event.publicId}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {formatDistanceToNow(new Date(event.firedAt))} ago</span>
          </div>
          
          <h3 className="text-sm font-bold text-ois-text group-hover:text-ois-primary transition-colors truncate">
            {event.title}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <EventStatusBadge status={event.status} />
            <EventTypeBadge type={event.type} />
            <EventSourceChip source={event.source} />
            
            {event.affectedCIIds.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-ois-primary-pale text-ois-primary text-[10px] font-bold">
                <Shield size={10} /> {event.affectedCIIds.length} CI{event.affectedCIIds.length > 1 ? 's' : ''}
              </div>
            )}
            
            {event.linkedIncidentId && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-ois-danger-pale text-ois-danger text-[10px] font-bold">
                <ExternalLink size={10} /> {event.linkedIncidentId}
              </div>
            )}
          </div>
        </div>

        {/* Actions Rail */}
        <div className="flex items-center gap-2" onClick={stopProp}>
          {event.status === 'open' && (
            <button className="px-3 py-1.5 bg-ois-primary text-white text-xs font-bold rounded hover:bg-ois-primary-hover transition-colors">
              Acknowledge
            </button>
          )}
          {event.status === 'acknowledged' && (
            <button className="px-3 py-1.5 bg-ois-success text-white text-xs font-bold rounded hover:bg-ois-success-hover transition-colors">
              Resolve
            </button>
          )}
          <button className="p-2 text-ois-text-subtle hover:text-ois-text hover:bg-ois-bg rounded transition-all">
            <MessageSquare size={16} />
          </button>
          <button className="p-2 text-ois-text-subtle hover:text-ois-text hover:bg-ois-bg rounded transition-all">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
