import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, Target, AlertOctagon } from 'lucide-react';
import { mockSLATargets } from '@/src/mocks/slaTargets';
import { mockOutages, getOngoingOutages } from '@/src/mocks/outages';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Overview',    to: '/availability',          icon: Activity,    end: true },
  { label: 'SLA Targets', to: '/availability/sla',      icon: Target },
  { label: 'Outages',     to: '/availability/outages',  icon: AlertOctagon },
];

export const AvailabilityLayout: React.FC = () => {
  const ongoing = getOngoingOutages().length;
  const breachedSLAs = mockSLATargets.filter(s => s.status === 'breached').length;
  const atRiskSLAs = mockSLATargets.filter(s => s.status === 'at_risk').length;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentOutages = mockOutages.filter(o => new Date(o.startedAt).getTime() >= thirtyDaysAgo).length;

  const accentColor =
    ongoing > 0       ? '#B42318' :
    breachedSLAs > 0  ? '#B42318' :
    atRiskSLAs > 0    ? '#DC6803' :
    '#12B76A';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Availability</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{mockSLATargets.length} SLAs tracked</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{recentOutages} outages (30d)</span>
              {ongoing > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{ongoing} ongoing</span>
                </>
              )}
              {breachedSLAs > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{breachedSLAs} SLA breached</span>
                </>
              )}
              {atRiskSLAs > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{atRiskSLAs} at risk</span>
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
