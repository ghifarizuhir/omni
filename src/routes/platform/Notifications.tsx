import React, { useState } from 'react';
import { Bell, Check, MessageSquare, Settings, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { mockNotifications, MockNotificationItem } from '@/src/mocks/notifications';
import { formatRelative } from '@/src/lib/format';

type FilterId = 'all' | 'unread' | 'mentions';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'unread',   label: 'Unread' },
  { id: 'mentions', label: 'Mentions' },
];

function NotificationIcon({ type }: { type: MockNotificationItem['type'] }) {
  const styles = {
    mention: 'bg-ois-info-pale text-ois-info',
    update:  'bg-ois-success-pale text-ois-success',
    system:  'bg-ois-surface-muted text-ois-text-subtle',
    info:    'bg-ois-warning-pale text-ois-warning',
  };
  const icons = {
    mention: <MessageSquare size={14} />,
    update:  <Check size={14} />,
    system:  <Settings size={14} />,
    info:    <Info size={14} />,
  };
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', styles[type])}>
      {icons[type]}
    </div>
  );
}

export const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<FilterId>('all');
  const navigate = useNavigate();

  const unreadCount = mockNotifications.filter(n => !n.readAt).length;

  const filtered = mockNotifications.filter(n => {
    if (filter === 'unread')   return !n.readAt;
    if (filter === 'mentions') return n.type === 'mention';
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ois-text tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-ois-text-muted mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <button className="text-xs font-semibold text-ois-primary hover:underline">
          Mark all as read
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-ois-border mb-4">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              filter === f.id
                ? 'border-ois-primary text-ois-primary'
                : 'border-transparent text-ois-text-muted hover:text-ois-text'
            )}
          >
            {f.label}
            {f.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-xs font-bold text-ois-primary">({unreadCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-ois-text-muted">
          <Bell size={36} className="mb-3 opacity-20" />
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        <div className="divide-y divide-ois-border border border-ois-border rounded-ois-card overflow-hidden bg-white">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => n.url && navigate(n.url)}
              className={cn(
                'flex gap-4 p-4 relative transition-colors',
                n.url ? 'cursor-pointer hover:bg-ois-surface-muted' : 'cursor-default',
                !n.readAt && 'bg-ois-primary-pale/20'
              )}
            >
              {!n.readAt && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-ois-primary rounded-l" />
              )}
              <NotificationIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    'text-sm font-semibold leading-tight',
                    !n.readAt ? 'text-ois-text' : 'text-ois-text-muted'
                  )}>
                    {n.title}
                    {!n.readAt && <span className="inline-block w-1.5 h-1.5 rounded-full bg-ois-primary ml-2 mb-0.5 align-middle" />}
                  </span>
                  <span className="text-[11px] text-ois-text-subtle whitespace-nowrap shrink-0">
                    {formatRelative(n.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-ois-text-muted mt-0.5 leading-snug">{n.body}</p>
                {n.sourceRef && (
                  <span className="text-[10px] font-mono text-ois-text-subtle mt-1 block">{n.sourceRef}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
