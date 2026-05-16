import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard, Inbox, AlertCircle, Bug, ShoppingCart,
  BookOpen, Wrench, Package, Rocket, CheckCircle2, Store,
  Heart, Zap, Lock, Radio, CircleDot, Clock,
  Lightbulb, Database, Settings,
  Sparkles, Activity, Shield, GitBranch, BarChart3,
} from 'lucide-react';
import { SidebarContextMenu } from './SidebarContextMenu';
import { usePinnedPaths } from '@/src/lib/sidebar-pins';
import {
  inboxService,
  incidentsService,
  problemsService,
  requestsService,
  changesService,
  deploymentsService,
  releasesService,
  availabilityService,
  testingService,
  onCallService,
  improvementsService,
  useResource,
} from '@/src/services';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { useAuthSession } from '@/src/lib/auth/session';

const SIDEBAR_LOOKUP: Record<string, { label: string; icon: React.ReactNode }> = {
  '/':               { label: 'Overview',          icon: <LayoutDashboard size={18} /> },
  '/inbox':          { label: 'Inbox',             icon: <Inbox size={18} /> },
  '/incidents':      { label: 'Incidents',         icon: <AlertCircle size={18} /> },
  '/problems':       { label: 'Problems',          icon: <Bug size={18} /> },
  '/portal':         { label: 'Self-Service Portal', icon: <Store size={18} /> },
  '/requests':       { label: 'Service Requests',  icon: <ShoppingCart size={18} /> },
  '/kb':             { label: 'Knowledge Base',    icon: <BookOpen size={18} /> },
  '/changes':        { label: 'Changes',           icon: <Wrench size={18} /> },
  '/releases':       { label: 'Releases',          icon: <Package size={18} /> },
  '/deployments':    { label: 'Deployments',       icon: <Rocket size={18} /> },
  '/testing/plans':  { label: 'Testing',           icon: <CheckCircle2 size={18} /> },
  '/availability':   { label: 'Availability',      icon: <Heart size={18} /> },
  '/capacity':       { label: 'Capacity',          icon: <Zap size={18} /> },
  '/continuity/bia': { label: 'Continuity',        icon: <Lock size={18} /> },
  '/status':         { label: 'Status Page',       icon: <CircleDot size={18} /> },
  '/monitoring':     { label: 'Monitoring',        icon: <Activity size={18} /> },
  '/dashboards':     { label: 'Measurement',       icon: <BarChart3 size={18} /> },
  '/cmdb':           { label: 'CMDB',              icon: <Database size={18} /> },
  '/on-call':        { label: 'On-Call',           icon: <Clock size={18} /> },
  '/improvement':    { label: 'Improvements',      icon: <Lightbulb size={18} /> },
  '/admin':          { label: 'RBAC Admin',        icon: <Shield size={18} /> },
  '/settings':       { label: 'Settings',          icon: <Settings size={18} /> },
};

interface SidebarProps {
  collapsed: boolean;
  isAiRoute: boolean;
  aiSidebarContent: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, isAiRoute, aiSidebarContent }) => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const session = useAuthSession();
  const isAdmin = !!session?.permissions.includes('system.admin');
  // ── Live signals ──────────────────────────────────────────────────────────
  const { data: inboxItems } = useResource(() => inboxService.items(), []);
  const { data: incidents } = useResource(() => incidentsService.list(), []);
  const { data: problems } = useResource(() => problemsService.list(), []);
  const { data: serviceRequests } = useResource(() => requestsService.list(), []);
  const { data: changes } = useResource(() => changesService.list(), []);
  const { data: deployments } = useResource(() => deploymentsService.list(), []);
  const { data: releases } = useResource(() => releasesService.list(), []);
  const { data: outages } = useResource(() => availabilityService.outages(), []);
  const { data: slaTargets } = useResource(() => availabilityService.slaTargets(), []);
  const { data: signOffs } = useResource(() => testingService.signOffs(), []);
  const { data: onCallSchedules } = useResource(() => onCallService.schedules(), []);
  const { data: improvements } = useResource(() => improvementsService.list(), []);

  const urgentInboxCount = (inboxItems ?? []).filter(i => i.priority === 'urgent').length;
  const openIncidentCount = (incidents ?? []).filter(i => !['resolved', 'closed'].includes(i.status)).length;
  const openProblemCount = (problems ?? []).filter(
    p => !['closed'].includes(p.status),
  ).length;
  const requestsAwaitingUserCount = (serviceRequests ?? []).filter(r => r.status === 'pending_user').length;
  const changesAwaitingCabCount = (changes ?? []).filter(
    c => c.status === 'submitted' || c.status === 'in_review',
  ).length;
  const deploymentsActiveCount = (deployments ?? []).filter(
    d => d.status === 'running' || d.status === 'rolling_back',
  ).length;
  const releasesUrgentCount = (releases ?? []).filter(r => r.status === 'rolled_back').length;
  const availabilityCriticalCount =
    (outages ?? []).filter(o => !o.endedAt).length +
    (slaTargets ?? []).filter(s => s.status === 'breached').length;
  const signOffsBreachedCount = (signOffs ?? []).filter(
    s => s.status === 'pending' && new Date(s.dueAt).getTime() < Date.now(),
  ).length;
  const onCallActiveIncidentCount = (onCallSchedules ?? []).reduce(
    (acc, s) => acc + s.activeIncidentCount,
    0,
  );
  const improvementsBlockedCount = (improvements ?? []).filter(
    i => i.priority === 'critical' && i.status === 'on_hold',
  ).length;

  const [menu, setMenu] = useState<{ x: number; y: number; path: string; label: string } | null>(null);
  const pinnedPaths = usePinnedPaths();

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
              <span className="font-mono text-[10px] text-ois-text-subtle tracking-[0.12em] uppercase leading-none mt-0.5">Intelligence Suite</span>
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
                    style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.04)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <LayoutDashboard size={11} className="relative z-10 shrink-0" />
                <span className="relative z-10 truncate">Management</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/ai')}
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
            /* Collapsed AI mode: show nothing — logo icon is sufficient */
            !collapsed ? (
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
            ) : null
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
                {pinnedPaths.length > 0 && (
                  <SidebarSection label="Favorites" collapsed={collapsed}>
                    {pinnedPaths.map(path => {
                      const meta = SIDEBAR_LOOKUP[path];
                      if (!meta) return null;
                      return (
                        <SidebarItem
                          key={path}
                          icon={meta.icon}
                          label={meta.label}
                          to={path}
                          collapsed={collapsed}
                          onOpenContextMenu={(x, y) => setMenu({ x, y, path, label: meta.label })}
                        />
                      );
                    })}
                  </SidebarSection>
                )}

                <SidebarSection label="Operations" collapsed={collapsed}>
                  <SidebarItem icon={<LayoutDashboard size={18} />} label="Overview" to="/" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/', label: 'Overview' })} />
                  <SidebarItem icon={<Inbox size={18} />} label="Inbox" to="/inbox" collapsed={collapsed} badge={urgentInboxCount} badgeVariant="urgent" onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/inbox', label: 'Inbox' })} />
                  <SidebarItem icon={<AlertCircle size={18} />} label="Incidents" to="/incidents" collapsed={collapsed} badge={openIncidentCount} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/incidents', label: 'Incidents' })} />
                  <SidebarItem icon={<Bug size={18} />} label="Problems" to="/problems" collapsed={collapsed} badge={openProblemCount} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/problems', label: 'Problems' })} />
                </SidebarSection>

                <SidebarSection label="Service Delivery" collapsed={collapsed}>
                  <SidebarItem icon={<Store size={18} />} label="Self-Service Portal" to="/portal" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/portal', label: 'Self-Service Portal' })} />
                  <SidebarItem icon={<ShoppingCart size={18} />} label="Service Requests" to="/requests" collapsed={collapsed} badge={requestsAwaitingUserCount} badgeVariant="warning" onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/requests', label: 'Service Requests' })} />
                  <SidebarItem icon={<BookOpen size={18} />} label="Knowledge Base" to="/kb" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/kb', label: 'Knowledge Base' })} />
                </SidebarSection>

                <SidebarSection label="Change & Delivery" collapsed={collapsed}>
                  <SidebarItem icon={<Wrench size={18} />} label="Changes" to="/changes" collapsed={collapsed} badge={changesAwaitingCabCount} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/changes', label: 'Changes' })} />
                  <SidebarItem icon={<Package size={18} />} label="Releases" to="/releases" collapsed={collapsed} badge={releasesUrgentCount} badgeVariant="urgent" onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/releases', label: 'Releases' })} />
                  <SidebarItem icon={<Rocket size={18} />} label="Deployments" to="/deployments" collapsed={collapsed} badge={deploymentsActiveCount} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/deployments', label: 'Deployments' })} />
                  <SidebarItem icon={<CheckCircle2 size={18} />} label="Testing" to="/testing/plans" collapsed={collapsed} badge={signOffsBreachedCount} badgeVariant="urgent" onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/testing/plans', label: 'Testing' })} />
                </SidebarSection>

                <SidebarSection label="Service Health" collapsed={collapsed}>
                  <SidebarItem icon={<Heart size={18} />} label="Availability" to="/availability" collapsed={collapsed} badge={availabilityCriticalCount} badgeVariant="urgent" onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/availability', label: 'Availability' })} />
                  <SidebarItem icon={<Zap size={18} />} label="Capacity" to="/capacity" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/capacity', label: 'Capacity' })} />
                  <SidebarItem icon={<Lock size={18} />} label="Continuity" to="/continuity/bia" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/continuity/bia', label: 'Continuity' })} />
                  <SidebarItem icon={<CircleDot size={18} />} label="Status Page" to="/status" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/status', label: 'Status Page' })} />
                </SidebarSection>

                <SidebarSection label="Observability" collapsed={collapsed}>
                  <SidebarItem icon={<Activity size={18} />} label="Monitoring" to="/monitoring" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/monitoring', label: 'Monitoring' })} />
                  <SidebarItem icon={<BarChart3 size={18} />} label="Measurement" to="/dashboards" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/dashboards', label: 'Measurement' })} />
                </SidebarSection>

                <SidebarSection label="Foundation" collapsed={collapsed}>
                  <SidebarItem icon={<Database size={18} />} label="CMDB" to="/cmdb" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/cmdb', label: 'CMDB' })} />
                  <SidebarItem icon={<Clock size={18} />} label="On-Call" to="/on-call" collapsed={collapsed} badge={onCallActiveIncidentCount} badgeVariant="urgent" onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/on-call', label: 'On-Call' })} />
                  <SidebarItem icon={<Lightbulb size={18} />} label="Improvements" to="/improvement" collapsed={collapsed} badge={improvementsBlockedCount} badgeVariant="urgent" onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/improvement', label: 'Improvements' })} />
                </SidebarSection>
              </div>

              {/* Footer Settings */}
              <div className="p-2 border-t border-ois-sidebar-border shrink-0 space-y-1">
                {isAdmin && (
                  <SidebarItem icon={<Shield size={18} />} label="RBAC Admin" to="/admin" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/admin', label: 'RBAC Admin' })} />
                )}
                <SidebarItem icon={<Settings size={18} />} label="Settings" to="/settings" collapsed={collapsed} onOpenContextMenu={(x, y) => setMenu({ x, y, path: '/settings', label: 'Settings' })} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {menu && (
        <SidebarContextMenu
          open
          x={menu.x}
          y={menu.y}
          path={menu.path}
          label={menu.label}
          onClose={() => setMenu(null)}
        />
      )}
    </aside>
  );
};

const SidebarSection: React.FC<{ label: string; collapsed: boolean; children: React.ReactNode }> = ({ label, collapsed, children }) => {
  if (collapsed) {
    return (
      <div className="px-2 [&:not(:first-child)]:before:block [&:not(:first-child)]:before:border-t [&:not(:first-child)]:before:border-ois-sidebar-border [&:not(:first-child)]:before:mx-2 [&:not(:first-child)]:before:my-3 [&:first-child]:pt-3">
        <div className="space-y-1">{children}</div>
      </div>
    );
  }
  return (
    <div className="mb-6 px-3 group/section">
      <div className="px-3 mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ois-sidebar-section-label group-has-[[aria-current='page']]/section:text-ois-primary transition-colors">
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
  badgeVariant?: 'default' | 'urgent' | 'warning';
  onOpenContextMenu?: (x: number, y: number) => void;
}> = ({ icon, label, to, collapsed, badge, badgeVariant = 'default', onOpenContextMenu }) => {
  const hasBadge = badge !== undefined && badge > 0;
  const dotColor =
    badgeVariant === 'urgent'  ? 'bg-ois-danger' :
    badgeVariant === 'warning' ? 'bg-ois-warning' :
    'bg-ois-text-subtle';

  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-ois-btn transition-colors overflow-hidden",
          isActive
            ? "bg-ois-sidebar-item-active-bg text-ois-sidebar-item-active-text"
            : "text-ois-sidebar-item hover:bg-ois-sidebar-item-hover-bg hover:text-ois-text"
        )
      }
      title={collapsed ? (hasBadge ? `${label} (${badge})` : label) : undefined}
      onContextMenu={onOpenContextMenu ? (e) => { e.preventDefault(); onOpenContextMenu(e.clientX, e.clientY); } : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px] bg-ois-primary"
              style={{ boxShadow: '0 0 12px 0 rgba(31,79,212,0.35)' }}
            />
          )}
          <div className={cn("shrink-0 relative", isActive ? "text-ois-primary" : "text-ois-text-muted group-hover:text-ois-text")}>
            {icon}
            {collapsed && hasBadge && (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-ois-sidebar-bg",
                  dotColor,
                )}
                aria-hidden
              />
            )}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 font-medium truncate shrink-0">{label}</span>
              {hasBadge && (
                <span
                  className={cn(
                    "shrink-0 flex items-center justify-center min-w-[20px] h-5 rounded px-1.5 text-[10px] font-bold leading-none",
                    badgeVariant === 'urgent'  ? "bg-ois-danger text-white" :
                    badgeVariant === 'warning' ? "bg-ois-warning text-white" :
                    "bg-ois-surface-muted text-ois-text-muted",
                  )}
                >
                  {badge}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
};
