import React from 'react';
import { Link } from 'react-router-dom';
import { linkifyEntities } from '@/src/lib/entity-linkify';
import { Archive, Pin, MailOpen, Clock, ExternalLink } from 'lucide-react';
import { InboxItem } from '@/src/types/platform';
import { formatDate } from '@/src/lib/format';
import { Button } from '@/src/components/ui/Button';
import { InboxTypeChip } from './InboxTypeChip';
import { InboxPriorityBadge } from './InboxPriorityBadge';
import { InboxActionButtons } from './InboxActionButtons';

// Simple markdown-lite renderer: **bold** and \n -> <br/>
function renderBody(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  parts.forEach((part, i) => {
    if (part === '\n') {
      nodes.push(<br key={`br-${i}`} />);
    } else if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={`bold-${i}`}>{part.slice(2, -2)}</strong>);
    } else {
      nodes.push(<React.Fragment key={`txt-${i}`}>{linkifyEntities(part)}</React.Fragment>);
    }
  });
  return nodes;
}

function getExpiresCountdown(expiresAt: string): string | null {
  const now = new Date().getTime();
  const exp = new Date(expiresAt).getTime();
  const diff = exp - now;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 24) return null;
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

interface InboxItemDetailProps {
  item: InboxItem;
  onArchive: () => void;
  onPin: () => void;
  onMarkUnread: () => void;
}

export const InboxItemDetail: React.FC<InboxItemDetailProps> = ({
  item,
  onArchive,
  onPin,
  onMarkUnread,
}) => {
  const expiresCountdown = item.expiresAt ? getExpiresCountdown(item.expiresAt) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ois-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <InboxPriorityBadge priority={item.priority} />
            <InboxTypeChip type={item.type} />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onArchive}
              className="gap-1.5 text-ois-text-muted hover:text-ois-text"
              title="Archive"
            >
              <Archive size={14} />
              <span className="hidden sm:inline">Archive</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onPin}
              className="gap-1.5 text-ois-text-muted hover:text-ois-text"
              title={item.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={14} />
              <span className="hidden sm:inline">{item.isPinned ? 'Unpin' : 'Pin'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkUnread}
              className="gap-1.5 text-ois-text-muted hover:text-ois-text"
              title="Mark as unread"
            >
              <MailOpen size={14} />
              <span className="hidden sm:inline">Mark unread</span>
            </Button>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-ois-text mt-3 leading-snug">{item.title}</h2>

        {/* Sender + timestamp */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-ois-text-muted font-medium">{item.senderName}</span>
          <span className="text-ois-text-subtle text-xs">·</span>
          <span className="text-xs text-ois-text-subtle">
            {formatDate(item.receivedAt, 'MMM d, yyyy HH:mm')} UTC
          </span>
        </div>

        {/* Expiry countdown */}
        {expiresCountdown && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-ois-danger font-medium">
            <Clock size={12} />
            {expiresCountdown}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {item.body ? (
          <p className="text-sm text-ois-text leading-relaxed">
            {renderBody(item.body)}
          </p>
        ) : (
          <p className="text-sm text-ois-text-muted leading-relaxed">{linkifyEntities(item.summary)}</p>
        )}

        {/* Divider */}
        <hr className="border-ois-border my-5" />

        {/* Source reference */}
        <div className="flex items-start gap-2 mb-6">
          <span className="text-xs text-ois-text-subtle">Source:</span>
          <div className="flex flex-col gap-0.5">
            <Link
              to={item.sourceUrl}
              className="text-xs font-mono text-ois-primary hover:underline inline-flex items-center gap-1"
            >
              {item.sourcePublicId}
              <ExternalLink size={10} />
            </Link>
            <span className="text-xs text-ois-text-muted">{item.sourceTitle}</span>
          </div>
        </div>

        {/* Action buttons */}
        <InboxActionButtons primary={item.primaryAction} secondary={item.secondaryAction} />
      </div>
    </div>
  );
};
