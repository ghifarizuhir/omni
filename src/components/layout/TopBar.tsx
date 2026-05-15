import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search as SearchIcon, Bell, Inbox, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { cn } from '@/src/lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';
import { useBreadcrumbs } from '@/src/lib/breadcrumbs';
import { inboxService, notificationsService, usersService, useResource } from '@/src/services';
import { AppScopeSwitcher } from '../scope/AppScopeSwitcher';

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenInbox: () => void;
  onToggleAi?: () => void;
  aiOpen?: boolean;
  showAi?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenInbox, onToggleAi, aiOpen, showAi }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  const { data: inboxItems } = useResource(() => inboxService.items(), []);
  const { data: notifications } = useResource(() => notificationsService.list(), []);
  const { data: currentUser } = useResource(() => usersService.current(), []);

  const urgentInboxCount = (inboxItems ?? []).filter(i => i.priority === 'urgent').length;
  const unreadNotifCount = (notifications ?? []).filter(n => !n.readAt).length;

  return (
    <header
      className="h-14 flex items-center px-4 bg-white border-b border-ois-border shrink-0 z-20"
      style={{ boxShadow: '0 1px 2px -1px rgba(16,24,40,0.06)' }}
    >
      {/* Left — hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted">
          <Menu size={20} />
        </Button>
        <nav className="flex items-center gap-1 text-xs font-medium">
          <Link to="/" className="text-ois-text-subtle hover:text-ois-text transition-colors">Home</Link>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <span className="text-ois-text-subtle px-0.5">/</span>
              {crumb.href ? (
                <Link to={crumb.href} className="text-ois-text-muted hover:text-ois-text transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ois-text">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right — scope switcher + search + inbox + notifications + user */}
      <div className="flex items-center gap-2 ml-auto">
        <div
          className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full border border-ois-border bg-ois-surface-muted mr-1"
          title="Platform health"
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ois-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ois-success" />
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-ois-text-muted">
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>
        <AppScopeSwitcher />
        <div className="relative mr-4 hidden md:block w-72 lg:w-96">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none">
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Search across OIS..."
            className="w-full h-9 pl-10 pr-12 bg-ois-surface-muted rounded-ois-btn border border-ois-border text-ois-text placeholder:text-ois-text-subtle focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/15 text-sm transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-ois-border bg-white text-[10px] font-medium text-ois-text-muted">/</kbd>
          </div>
        </div>

        <div className="relative">
          <Button variant="ghost" size="icon" onClick={onOpenInbox} className="text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted relative">
            <Inbox size={20} />
            {urgentInboxCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-ois-danger text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {urgentInboxCount}
              </span>
            )}
          </Button>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn("text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted relative", showNotifications && "bg-ois-surface-muted text-ois-text")}
          >
            <Bell size={20} />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-ois-primary border-2 border-white rounded-full" />
            )}
          </Button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {showAi && onToggleAi && (
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleAi}
              aria-label="AI Quick Assist"
              aria-expanded={aiOpen}
              className={cn("text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted relative", aiOpen && "bg-ois-primary-pale text-ois-primary")}
            >
              <Sparkles size={20} />
            </Button>
            <div className="absolute top-full right-0 mt-1.5 px-2.5 py-1.5 bg-ois-text text-white rounded-md text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg">
              AI Quick Assist <span className="opacity-60 ml-1">⌘K</span>
            </div>
          </div>
        )}

        <div className="relative ml-2">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 focus:outline-none">
            <Avatar name={currentUser?.name ?? ''} size="sm" />
          </button>
          {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
        </div>
      </div>
    </header>
  );
};
