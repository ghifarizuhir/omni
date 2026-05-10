import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard, Inbox, AlertCircle, Bug, ShoppingCart,
  BookOpen, Wrench, Package, Rocket, CheckCircle2, Store,
  Heart, Zap, Lock, Radio, CircleDot, Bell, Clock,
  BarChart3, Lightbulb, Database, Settings, ChevronLeft, ChevronRight,
  FileText, Gauge, Sparkles,
} from 'lucide-react';
import { mockInboxItems, mockIncidents } from '@/src/mocks';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isAiRoute: boolean;
  aiSidebarContent: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, isAiRoute, aiSidebarContent }) => {
  const navigate = useNavigate();
  const urgentInboxCount = mockInboxItems.filter(i => i.priority === 'urgent').length;
  const openIncidentCount = mockIncidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;

  return (
    <aside
      className={cn(
        "flex flex-col bg-ois-sidebar-bg border-r border-ois-sidebar-border transition-all duration-300 z-30",
        collapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Brand + Mode Toggle Header */}
      <div className="shrink-0 border-b border-ois-sidebar-border overflow-hidden">
        {/* Brand row */}
        <div className="h-14 flex items-center px-4 gap-3">
          <div
            className="w-8 h-8 rounded-[7px] flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1F4FD4 0%, #185FA5 60%, #0C447C 100%)',
              boxShadow: '0 1px 4px rgba(31,79,212,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }}
            />
            <span className="relative text-white font-black text-[11px] tracking-tight">OIS</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-[13px] text-ois-text tracking-tight leading-none truncate">Omni</span>
              <span className="text-[10px] text-ois-text-subtle tracking-[0.05em] uppercase leading-none mt-0.5">Intelligence Suite</span>
            </div>
          )}
        </div>

        {/* Mode toggle — hidden when collapsed */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <div
              role="group"
              aria-label="Application mode"
              className="flex items-center bg-ois-surface-muted border border-ois-border rounded-[8px] p-[3px] gap-0"
            >
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={!isAiRoute}
                aria-pressed={!isAiRoute}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors duration-150 z-10",
                  !isAiRoute ? "text-ois-text" : "text-ois-text-muted hover:text-ois-text"
                )}
              >
                {!isAiRoute && (
                  <motion.div
                    layoutId="sidebar-mode-indicator"
                    className="absolute inset-0 rounded-[6px] bg-white border border-ois-border"
                    style={{ boxShadow: '0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <LayoutDashboard size={11} className="relative z-10 shrink-0" />
                <span className="relative z-10 truncate">Management</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/ai')}
                disabled={isAiRoute}
                aria-pressed={isAiRoute}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors duration-150 z-10",
                  isAiRoute ? "text-white" : "text-ois-text-muted hover:text-ois-text"
                )}
              >
                {isAiRoute && (
                  <motion.div
                    layoutId="sidebar-mode-indicator"
                    className="absolute inset-0 rounded-[6px]"
                    style={{
                      background: 'linear-gradient(135deg, #1F4FD4 0%, #185FA5 100%)',
                      boxShadow: '0 1px 3px rgba(31,79,212,0.4), 0 0 0 1px rgba(31,79,212,0.2)',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Sparkles size={11} className="relative z-10 shrink-0" />
                <span className="relative z-10 truncate">AI Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content — crossfades between management nav and AI session panel */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <AnimatePresence mode="wait">
          {isAiRoute ? (
            <motion.div
              key="ai-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden flex flex-col min-h-0"
            >
              {aiSidebarContent}
            </motion.div>
          ) : (
            <motion.div
              key="mgmt-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-y-auto flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                <SidebarSection label="Operations" collapsed={collapsed}>
                  <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/" collapsed={collapsed} />
                  <SidebarItem icon={<Inbox size={18} />} label="Inbox" to="/inbox" collapsed={collapsed} badge={urgentInboxCount} badgeVariant="urgent" />
                  <SidebarItem icon={<AlertCircle size={18} />} label="Incidents" to="/incidents" collapsed={collapsed} badge={openIncidentCount} />
                  <SidebarItem icon={<Bug size={18} />} label="Problems" to="/problems" collapsed={collapsed} />
                  <SidebarItem icon={<Store size={18} />} label="Self-Service Portal" to="/portal" collapsed={collapsed} />
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

                <SidebarSection label="Measurement" collapsed={collapsed}>
                  <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboards" to="/dashboards" collapsed={collapsed} />
                  <SidebarItem icon={<FileText size={18} />} label="Reports" to="/reports" collapsed={collapsed} />
                  <SidebarItem icon={<Gauge size={18} />} label="Metric Catalog" to="/metrics/catalog" collapsed={collapsed} />
                </SidebarSection>

                <SidebarSection label="Platform" collapsed={collapsed}>
                  <SidebarItem icon={<Bell size={18} />} label="Notifications" to="/notifications/preferences" collapsed={collapsed} />
                  <SidebarItem icon={<Clock size={18} />} label="On-Call" to="/on-call" collapsed={collapsed} />
                  <SidebarItem icon={<Lightbulb size={18} />} label="Improvements" to="/improvement" collapsed={collapsed} />
                  <SidebarItem icon={<Database size={18} />} label="CMDB" to="/cmdb" collapsed={collapsed} />
                </SidebarSection>
              </div>

              {/* Footer Settings */}
              <div className="p-2 border-t border-ois-sidebar-border shrink-0">
                <SidebarItem icon={<Settings size={18} />} label="Settings" to="/settings" collapsed={collapsed} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
};

const SidebarSection: React.FC<{ label: string; collapsed: boolean; children: React.ReactNode }> = ({ label, collapsed, children }) => {
  if (collapsed) return <div className="space-y-1 my-4">{children}</div>;
  return (
    <div className="mb-6 px-3">
      <div className="px-3 mb-2 text-[10px] font-bold text-ois-sidebar-section-label uppercase tracking-[0.1em]">
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  to: string;
  collapsed: boolean;
  badge?: number;
  badgeVariant?: 'default' | 'urgent';
}> = ({ icon, label, to, collapsed, badge, badgeVariant = 'default' }) => {
  const location = useLocation();
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-ois-btn transition-colors overflow-hidden",
          isActive
            ? "bg-ois-sidebar-item-active-bg text-ois-sidebar-item-active-text"
            : "text-ois-sidebar-item hover:bg-ois-sidebar-item-hover-bg hover:text-ois-text"
        )
      }
      title={collapsed ? label : undefined}
    >
      {isActive && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-ois-primary"
          style={{ boxShadow: 'inset 3px 0 0 0 var(--ois-primary)' }}
        />
      )}
      <div className={cn("shrink-0", isActive ? "text-ois-primary font-bold" : "text-ois-text-muted group-hover:text-ois-text")}>
        {icon}
      </div>
      {!collapsed && (
        <>
          <span className="flex-1 font-medium truncate shrink-0">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                "shrink-0 flex items-center justify-center min-w-[20px] h-5 rounded px-1.5 text-[10px] font-bold leading-none",
                badgeVariant === 'urgent' ? "bg-ois-danger text-white" : "bg-ois-border-strong text-ois-text-muted"
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};
