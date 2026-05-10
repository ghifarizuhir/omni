import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { mockMeasurementDashboards } from '@/src/mocks/measurementDashboards';
import { DashboardCard } from '@/src/components/measurement/DashboardCard';

export const DashboardsIndex: React.FC = () => {
  const navigate = useNavigate();

  const totalViews = useMemo(
    () => mockMeasurementDashboards.reduce((sum, d) => sum + d.viewCount30d, 0),
    [],
  );

  const handleOpen = (dashboardId: string) => {
    if (dashboardId === 'dash-001') {
      navigate('/dashboards/exec');
    } else {
      navigate('/dashboards/exec');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Dashboards</h1>
          <p className="mt-0.5 text-sm text-ois-text-subtle">
            {mockMeasurementDashboards.length} pre-built dashboards · {totalViews} views this month
          </p>
        </div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 rounded-lg border border-ois-border bg-white px-3 py-2 text-sm font-medium text-ois-text hover:bg-ois-surface-muted transition-colors"
        >
          Reports
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mockMeasurementDashboards.map((dashboard) => (
          <DashboardCard
            key={dashboard.id}
            dashboard={dashboard}
            onOpen={() => handleOpen(dashboard.id)}
          />
        ))}
      </div>
    </div>
  );
};
