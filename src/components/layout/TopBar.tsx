import React, { useState } from 'react';
import { Menu, Search as SearchIcon, Bell, Inbox, User, LogOut, Settings as SettingsIcon, LayoutDashboard, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { cn } from '@/src/lib/utils';
import { mockInboxItems, mockNotifications, currentUser } from '@/src/mocks';
import { NotificationDropdown } from './NotificationDropdown';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenInbox: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenInbox }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAiRoute = location.pathname.startsWith('/ai');

  const urgentInboxCount = mockInboxItems.filter(i => i.priority === 'urgent').length;
  const unreadNotifCount = mockNotifications.filter(n => !n.readAt).length;

  return (
    <header className="h-14 relative flex items-center px-4 bg-ois-surface border-b border-ois-border shrink-0 z-20" style={{ boxShadow: '0 1px 0 0 #E4E7EC, 0 2px 8px -2px rgba(16,24,40,0.06)' }}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-ois-text-muted">
          <Menu size={20} />
        </Button>

        {/* Breadcrumb - Placeholder for now */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-ois-text-subtle">Home</span>
          <span className="text-ois-border-strong px-0.5">/</span>
          <span className="text-ois-text">Dashboard</span>
        </div>
      </div>

      {/* Center: Mode Toggle — truly centered via absolute positioning */}
      <div
        role="group"
        aria-label="Application mode"
        className="absolute left-1/2 -translate-x-1/2 flex items-center bg-ois-surface-muted border border-ois-border rounded-[8px] p-[3px] gap-0"
      >
        <div className="relative flex items-center">
          {/* Management tab */}
          <button
            type="button"
            disabled={!isAiRoute}
            onClick={() => navigate('/')}
            aria-pressed={!isAiRoute}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors duration-150 z-10",
              !isAiRoute
                ? "text-ois-text"
                : "text-ois-text-muted hover:text-ois-text"
            )}
          >
            {!isAiRoute && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-[6px] bg-white border border-ois-border"
                style={{ boxShadow: '0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <LayoutDashboard size={12} className="relative z-10" />
            <span className="relative z-10">Management</span>
          </button>

          {/* AI Workspace tab */}
          <button
            type="button"
            disabled={isAiRoute}
            onClick={() => navigate('/ai')}
            aria-pressed={isAiRoute}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors duration-150 z-10",
              isAiRoute
                ? "text-white"
                : "text-ois-text-muted hover:text-ois-text"
            )}
          >
            {isAiRoute && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-[6px]"
                style={{
                  background: 'linear-gradient(135deg, #1F4FD4 0%, #185FA5 100%)',
                  boxShadow: '0 1px 3px rgba(31,79,212,0.4), 0 0 0 1px rgba(31,79,212,0.2)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Sparkles size={12} className="relative z-10" />
            <span className="relative z-10">AI Workspace</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Global Search */}
        <div className="relative mr-4 hidden md:block w-72 lg:w-96">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none">
            <SearchIcon size={16} />
          </div>
          <input 
            type="text" 
            placeholder="Search across OIS..." 
            className="w-full h-9 pl-10 pr-12 bg-ois-surface-muted rounded-ois-btn border-transparent focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/20 text-sm transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-ois-border bg-ois-surface text-[10px] font-medium text-ois-text-subtle">/</kbd>
          </div>
        </div>

        {/* Inbox */}
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={onOpenInbox} className="text-ois-text-muted relative">
            <Inbox size={20} />
            {urgentInboxCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-ois-danger text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-ois-surface">
                {urgentInboxCount}
              </span>
            )}
          </Button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowNotifications(!showNotifications)} 
            className={cn("text-ois-text-muted relative", showNotifications && "bg-ois-surface-muted")}
          >
            <Bell size={20} />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-ois-primary border-2 border-ois-surface rounded-full shadow-[0_0_0_1px_rgba(255,255,255,1)]" />
            )}
          </Button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User Menu */}
        <div className="relative ml-2">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <Avatar name={currentUser.name} size="sm" />
          </button>
          {showUserMenu && (
            <UserMenu onClose={() => setShowUserMenu(false)} />
          )}
        </div>
      </div>
    </header>
  );
};
