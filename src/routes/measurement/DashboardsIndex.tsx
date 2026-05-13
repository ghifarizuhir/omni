import React from 'react';
import { useNavigate } from 'react-router-dom';
import { measurementService, useResource } from '@/src/services';
import { DashboardCard } from '@/src/components/measurement/DashboardCard';

export const DashboardsIndex: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useResource(() => measurementService.dashboards(), []);
  const mockMeasurementDashboards = data ?? [];

  const handleOpen = (_dashboardId: string) => {
    navigate('/dashboards/exec');
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
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
