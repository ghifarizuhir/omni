import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, Radio, Shield, GitBranch, CircleDot } from 'lucide-react';
import { eventsService, useResource } from '../../services';
import { cn } from '../../lib/utils';

const TABS = [
  { label: 'Overview',      to: '/monitoring',           icon: Activity,   end: true },
  { label: 'Event Stream',  to: '/monitoring/events',    icon: Radio },
  { label: 'Rules',         to: '/monitoring/rules',     icon: Shield },
  { label: 'Alert Routing', to: '/monitoring/routing',   icon: GitBranch },
  { label: 'Coverage',      to: '/monitoring/coverage',  icon: CircleDot },
];

export const MonitoringLayout: React.FC = () => {
  const { data } = useResource(() => eventsService.list(), []);
  const events = data ?? [];
  const activeEvents = events.filter(e => e.status === 'open' || e.status === 'acknowledged');
  const p1Count = activeEvents.filter(e => e.severity === 'P1').length;
  const p2Count = activeEvents.filter(e => e.severity === 'P2').length;
  const openCount = events.filter(e => e.status === 'open').length;

  const accentColor = p1Count > 0 ? '#B42318' : p2Count > 0 ? '#DC6803' : '#1F4FD4';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Shared header ── */}
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">

        {/* Title block */}
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Monitoring</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{activeEvents.length} active</span>
              {p1Count > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{p1Count} P1 open</span>
                </>
              )}
              {p2Count > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{p2Count} P2 open</span>
                </>
              )}
              {openCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span>{openCount} unacknowledged</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <nav className="flex px-4 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-ois-primary text-ois-primary'
                  : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong'
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
};
