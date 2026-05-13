import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Gauge, TrendingUp, AlertTriangle } from 'lucide-react';
import { mockCapacityMetrics } from '@/src/mocks/capacityMetrics';
import { mockCapacityForecasts } from '@/src/mocks/capacityForecasts';
import { mockCapacityThresholds } from '@/src/mocks/capacityThresholds';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Overview',   to: '/capacity',            icon: Gauge,         end: true },
  { label: 'Forecast',   to: '/capacity/forecast',   icon: TrendingUp },
  { label: 'Thresholds', to: '/capacity/thresholds', icon: AlertTriangle },
];

export const CapacityLayout: React.FC = () => {
  const critical = mockCapacityMetrics.filter(m => m.utilizationPercent >= m.criticalThreshold).length;
  const warning  = mockCapacityMetrics.filter(
    m => m.utilizationPercent >= m.warningThreshold && m.utilizationPercent < m.criticalThreshold,
  ).length;

  const imminent = mockCapacityForecasts.filter(
    f => f.daysUntilBreach !== undefined && f.daysUntilBreach <= 30,
  ).length;
  const enabledThresholds = mockCapacityThresholds.filter(t => t.enabled).length;

  const accentColor =
    critical > 0 ? '#B42318' :
    warning > 0  ? '#DC6803' :
    imminent > 0 ? '#DC6803' :
    '#12B76A';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Capacity &amp; Performance</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{mockCapacityMetrics.length} metrics</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{enabledThresholds} active thresholds</span>
              {critical > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{critical} critical</span>
                </>
              )}
              {warning > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{warning} warning</span>
                </>
              )}
              {imminent > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{imminent} breach in 30d</span>
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
