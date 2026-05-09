import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { 
  LayoutDashboard, Inbox, AlertCircle, Bug, ShoppingCart, 
  BookOpen, Wrench, Package, Rocket, CheckCircle2, 
  Heart, Zap, Lock, Radio, CircleDot, Bell, Clock, 
  BarChart3, Lightbulb, Database, Settings, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { mockInboxItems, mockIncidents } from '@/src/mocks';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const urgentInboxCount = mockInboxItems.filter(i => i.priority === 'urgent').length;
  const openIncidentCount = mockIncidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;

  return (
    <aside 
      className={cn(
        "flex flex-col bg-ois-sidebar-bg border-r border-ois-sidebar-border transition-all duration-300 z-30",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center px-4 border-b border-ois-sidebar-border shrink-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-ois-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">OIS</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-ois-text truncate">Omni Intelligence</span>
          )}
        </div>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <SidebarSection label="Operations" collapsed={collapsed}>
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/" collapsed={collapsed} />
          <SidebarItem icon={<Inbox size={18} />} label="Inbox" to="/inbox" collapsed={collapsed} badge={urgentInboxCount} badgeVariant="urgent" />
          <SidebarItem icon={<AlertCircle size={18} />} label="Incidents" to="/incidents" collapsed={collapsed} badge={openIncidentCount} />
          <SidebarItem icon={<Bug size={18} />} label="Problems" to="/problems" collapsed={collapsed} />
          <SidebarItem icon={<ShoppingCart size={18} />} label="Service Requests" to="/requests" collapsed={collapsed} />
          <SidebarItem icon={<BookOpen size={18} />} label="Knowledge Base" to="/kb" collapsed={collapsed} />
        </SidebarSection>

        <SidebarSection label="Change & Delivery" collapsed={collapsed}>
          <SidebarItem icon={<Wrench size={18} />} label="Changes" to="/changes" collapsed={collapsed} />
          <SidebarItem icon={<Package size={18} />} label="Releases" to="/releases" collapsed={collapsed} />
          <SidebarItem icon={<Rocket size={18} />} label="Deployments" to="/deployments" collapsed={collapsed} />
          <SidebarItem icon={<CheckCircle2 size={18} />} label="Validation" to="/testing/plans" collapsed={collapsed} />
        </SidebarSection>

        <SidebarSection label="Service Health" collapsed={collapsed}>
          <SidebarItem icon={<Heart size={18} />} label="Availability" to="/availability" collapsed={collapsed} />
          <SidebarItem icon={<Zap size={18} />} label="Capacity" to="/capacity" collapsed={collapsed} />
          <SidebarItem icon={<Lock size={18} />} label="Continuity" to="/continuity/bia" collapsed={collapsed} />
        </SidebarSection>

        <SidebarSection label="Observability" collapsed={collapsed}>
          <SidebarItem icon={<Radio size={18} />} label="Events" to="/events" collapsed={collapsed} />
          <SidebarItem icon={<CircleDot size={18} />} label="Status Page" to="/status" collapsed={collapsed} />
        </SidebarSection>

        <SidebarSection label="Platform" collapsed={collapsed}>
          <SidebarItem icon={<Bell size={18} />} label="Notifications" to="/notifications" collapsed={collapsed} />
          <SidebarItem icon={<Clock size={18} />} label="On-Call" to="/oncall" collapsed={collapsed} />
          <SidebarItem icon={<BarChart3 size={18} />} label="Reports" to="/reports" collapsed={collapsed} />
          <SidebarItem icon={<Lightbulb size={18} />} label="Improvements" to="/improvement" collapsed={collapsed} />
          <SidebarItem icon={<Database size={18} />} label="CMDB" to="/cmdb" collapsed={collapsed} />
        </SidebarSection>
      </div>

      {/* Footer Settings */}
      <div className="p-2 border-t border-ois-sidebar-border shrink-0">
        <SidebarItem icon={<Settings size={18} />} label="Settings" to="/settings" collapsed={collapsed} />
      </div>
    </aside>
  );
};

const SidebarSection: React.FC<{ label: string, collapsed: boolean, children: React.ReactNode }> = ({ label, collapsed, children }) => {
  if (collapsed) return <div className="space-y-1 my-4">{children}</div>;
  return (
    <div className="mb-6 px-3">
      <div className="px-3 mb-2 text-[10px] font-bold text-ois-sidebar-section-label uppercase tracking-[0.1em]">
        {label}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, to: string, collapsed: boolean, badge?: number, badgeVariant?: 'default' | 'urgent' }> = ({ icon, label, to, collapsed, badge, badgeVariant = 'default' }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink 
      to={to}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-3 px-3 py-2 rounded-ois-btn transition-colors overflow-hidden",
        isActive 
          ? "bg-ois-sidebar-item-active-bg text-ois-sidebar-item-active-text" 
          : "text-ois-sidebar-item hover:bg-ois-sidebar-item-hover-bg hover:text-ois-text"
      )}
      title={collapsed ? label : undefined}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-ois-primary" style={{ boxShadow: 'inset 3px 0 0 0 var(--ois-primary)' }} />
      )}
      
      <div className={cn("shrink-0", isActive ? "text-ois-primary font-bold" : "text-ois-text-muted group-hover:text-ois-text")}>
        {icon}
      </div>
      
      {!collapsed && (
        <>
          <span className="flex-1 font-medium truncate shrink-0">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={cn(
              "shrink-0 flex items-center justify-center min-w-[20px] h-5 rounded px-1.5 text-[10px] font-bold leading-none",
              badgeVariant === 'urgent' ? "bg-ois-danger text-white" : "bg-ois-border-strong text-ois-text-muted"
            )}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};
