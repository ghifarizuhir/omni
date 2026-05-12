import React, { useState } from 'react';
import { Check, Bell, MessageSquare, Settings, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { mockNotifications } from '@/src/mocks';
import { formatRelative } from '@/src/lib/format';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const navigate = useNavigate();

  const filteredNotifications = mockNotifications.filter(n => {
    if (filter === 'unread') return !n.readAt;
    if (filter === 'mentions') return n.type === 'mention';
    return true;
  });

  const unreadCount = mockNotifications.filter(n => !n.readAt).length;

  return (
    <div 
      className="absolute right-0 mt-2 w-80 sm:w-[380px] bg-white border border-ois-border rounded-ois-card shadow-ois-dropdown overflow-hidden z-50 flex flex-col max-h-[500px]"
      onMouseLeave={onClose}
    >
      <div className="p-4 border-b border-ois-border bg-ois-surface flex items-center justify-between">
        <h3 className="font-bold text-ois-text">Notifications</h3>
        <Button variant="ghost" size="sm" className="text-ois-primary text-xs flex items-center gap-1 h-auto py-1">
          Mark all as read
        </Button>
      </div>

      <div className="flex border-b border-ois-border">
        <Tab active={filter === 'all'} onClick={() => setFilter('all')}>All</Tab>
        <Tab active={filter === 'unread'} onClick={() => setFilter('unread')}>
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </Tab>
        <Tab active={filter === 'mentions'} onClick={() => setFilter('mentions')}>Mentions</Tab>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-ois-border">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => {
                if (notification.url) { onClose(); navigate(notification.url); }
              }}
              className={cn(
                'p-4 hover:bg-ois-surface-muted transition-colors flex gap-3 relative',
                notification.url ? 'cursor-pointer' : 'cursor-default',
                !notification.readAt && 'bg-ois-primary-pale/30'
              )}
            >
              {!notification.readAt && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-ois-primary" />
              )}

              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                notification.type === 'mention' ? 'bg-ois-info-pale text-ois-info' :
                notification.type === 'update'  ? 'bg-ois-success-pale text-ois-success' :
                notification.type === 'system'  ? 'bg-ois-surface-muted text-ois-text-subtle' :
                'bg-ois-warning-pale text-ois-warning'
              )}>
                {notification.type === 'mention' ? <MessageSquare size={14} /> :
                 notification.type === 'update'  ? <Check size={14} /> :
                 notification.type === 'system'  ? <Settings size={14} /> :
                 <Info size={14} />}
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-semibold', !notification.readAt ? 'text-ois-text' : 'text-ois-text-muted')}>
                    {notification.title}
                  </span>
                  {!notification.readAt && <span className="w-2 h-2 rounded-full bg-ois-primary" />}
                </div>
                <p className="text-sm text-ois-text-muted leading-tight">{notification.body}</p>
                <div className="text-[11px] text-ois-text-subtle font-medium mt-1 uppercase tracking-wider">
                  {formatRelative(notification.createdAt)}
                  {notification.sourceRef && ` • ${notification.sourceRef}`}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-ois-text-muted">
            <Bell size={32} className="mx-auto mb-2 opacity-20" />
            <p>No notifications found</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-ois-surface-muted text-center border-t border-ois-border">
        <button
          className="text-xs font-bold text-ois-primary hover:underline"
          onClick={() => { navigate('/notifications'); onClose(); }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};

const Tab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex-1 py-2 text-xs font-semibold border-b-2 transition-all',
      active
        ? 'border-ois-primary text-ois-primary bg-ois-primary-pale/10'
        : 'border-transparent text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted'
    )}
  >
    {children}
  </button>
);
