import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, FileBarChart2, Tag } from 'lucide-react';
import { mockMeasurementDashboards } from '@/src/mocks/measurementDashboards';
import { mockReports } from '@/src/mocks/reports';
import { mockMetricDefinitions } from '@/src/mocks/metricDefinitions';
import { cn } from '@/src/lib/utils';

const TABS = [
  { label: 'Dashboards', to: '/dashboards',      icon: LayoutDashboard, end: true },
  { label: 'Executive',  to: '/dashboards/exec', icon: TrendingUp },
  { label: 'Reports',    to: '/reports',         icon: FileBarChart2 },
  { label: 'Metrics',    to: '/metrics/catalog', icon: Tag },
];

export const MeasurementLayout: React.FC = () => {
  const dashboardCount = mockMeasurementDashboards.length;
  const reportCount = mockReports.length;
  const metricCount = mockMetricDefinitions.length;

  const failedReports = mockReports.filter(r => r.lastRunStatus === 'failed').length;
  const scheduledReports = mockReports.filter(r => !!r.nextRunAt).length;
  const totalViews30d = mockMeasurementDashboards.reduce((acc, d) => acc + d.viewCount30d, 0);

  const accentColor =
    failedReports > 0 ? '#DC6803' :
    '#1F4FD4';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
        <div className="flex items-stretch">
          <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Measurement &amp; Reporting</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{dashboardCount} dashboards</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{reportCount} reports</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{metricCount} metrics</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{totalViews30d.toLocaleString()} views (30d)</span>
              {scheduledReports > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span>{scheduledReports} scheduled</span>
                </>
              )}
              {failedReports > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{failedReports} failed runs</span>
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
