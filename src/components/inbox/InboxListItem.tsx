import React, { useState } from 'react';
import { Archive, Pin, MailOpen } from 'lucide-react';
import { InboxItem } from '@/src/types/platform';
import { formatRelative } from '@/src/lib/format';
import { cn } from '@/src/lib/utils';
import { InboxTypeChip } from './InboxTypeChip';
import { InboxPriorityBadge } from './InboxPriorityBadge';
import { SeverityStripeRow, type StripeSeverity } from '@/src/components/ui/SeverityStripe';
import { IDCell } from '@/src/components/ui/IDCell';
import { Dot } from '@/src/components/ui/Dot';

const PRIORITY_TO_SEVERITY: Record<string, StripeSeverity> = {
  urgent: 'P1',
  high:   'P2',
  normal: 'P3',
  low:    'P4',
};

interface InboxListItemProps {
  item: InboxItem;
  isSelected: boolean;
  onClick: () => void;
  onArchive: () => void;
  onPin: () => void;
  onMarkRead: () => void;
}

export const InboxListItem: React.FC<InboxListItemProps> = ({
  item,
  isSelected,
  onClick,
  onArchive,
  onPin,
  onMarkRead,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <SeverityStripeRow
      severity={PRIORITY_TO_SEVERITY[item.priority] ?? 'P4'}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative px-3 py-3 border-b border-ois-border cursor-pointer transition-colors',
        isSelected
          ? 'bg-ois-primary/5'
          : 'hover:bg-ois-surface-muted'
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Unread dot */}
        <div className="flex-shrink-0 mt-1.5">
          {!item.isRead ? (
            <Dot variant="info" size="sm" pulse aria-label="Unread" />
          ) : (
            <span className="block w-2 h-2 rounded-full bg-transparent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row: priority + type + source ID + pin indicator */}
          <div className="flex items-center gap-1.5 mb-1">
            {(item.priority === 'urgent' || item.priority === 'high') && (
              <InboxPriorityBadge priority={item.priority} />
            )}
            <InboxTypeChip type={item.type} />
            {item.sourcePublicId && <IDCell value={item.sourcePublicId} />}
            {item.isPinned && <Pin size={10} className="text-ois-text-subtle ml-auto" />}
          </div>

          {/* Title */}
          <p
            className={cn(
              'text-xs leading-snug truncate mb-0.5',
              item.isRead ? 'text-ois-text font-normal' : 'text-ois-text font-semibold'
            )}
            title={item.title}
          >
            {item.title}
          </p>

          {/* Sender + time */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-ois-text-muted truncate">{item.senderName}</span>
            <span className="text-[11px] text-ois-text-subtle flex-shrink-0 ml-1">
              {formatRelative(item.receivedAt)}
            </span>
          </div>

          {/* Summary — 2 lines max */}
          {!hovered && (
            <p className="text-[11px] text-ois-text-subtle line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}

          {/* Hover quick actions */}
          {hovered && (
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-ois-text-muted hover:text-ois-text hover:bg-ois-border transition-colors"
                title="Archive"
              >
                <Archive size={10} />
                Archive
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onPin(); }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-ois-text-muted hover:text-ois-text hover:bg-ois-border transition-colors"
                title={item.isPinned ? 'Unpin' : 'Pin'}
              >
                <Pin size={10} />
                {item.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-ois-text-muted hover:text-ois-text hover:bg-ois-border transition-colors"
                title={item.isRead ? 'Mark unread' : 'Mark read'}
              >
                <MailOpen size={10} />
                {item.isRead ? 'Unread' : 'Read'}
              </button>
            </div>
          )}
        </div>
      </div>
    </SeverityStripeRow>
  );
};
