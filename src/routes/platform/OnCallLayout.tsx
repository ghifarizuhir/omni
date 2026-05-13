import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, Calendar, UserPlus } from 'lucide-react';
import { onCallService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Overview',  to: '/on-call',            icon: Users,    end: true },
  { label: 'Schedule',  to: '/on-call/schedule',   icon: Calendar },
  { label: 'Overrides', to: '/on-call/overrides',  icon: UserPlus },
];

export const OnCallLayout: React.FC = () => {
  const { data: schedulesData } = useResource(() => onCallService.schedules(), []);
  const { data: overridesData } = useResource(() => onCallService.overrides(), []);
  const schedules = schedulesData ?? [];
  const overrides = overridesData ?? [];

  const totalSchedules = schedules.length;
  const activeIncidents = schedules.reduce((acc, s) => acc + s.activeIncidentCount, 0);

  const now = Date.now();
  const activeOverrides = overrides.filter(
    o => o.status === 'approved'
      && new Date(o.startAt).getTime() <= now
      && new Date(o.endAt).getTime() >= now,
  ).length;
  const pendingOverrides = overrides.filter(o => o.status === 'pending').length;

  const accentColor =
    activeIncidents > 0   ? '#B42318' :
    pendingOverrides > 0  ? '#DC6803' :
    activeOverrides > 0   ? '#1F4FD4' :
    '#12B76A';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">On-Call</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{totalSchedules} schedules</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{activeOverrides} active overrides</span>
              {activeIncidents > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{activeIncidents} incidents engaged</span>
                </>
              )}
              {pendingOverrides > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{pendingOverrides} overrides pending</span>
                </>
              )}
            </div>
          </div>
        </div>

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
                  : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};
