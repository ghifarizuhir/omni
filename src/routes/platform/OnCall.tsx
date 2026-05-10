import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, CalendarDays, List } from 'lucide-react';
import { OnCallHeroSection } from '@/src/components/oncall/OnCallHeroSection';
import { UpcomingHandoversList } from '@/src/components/oncall/UpcomingHandoversList';
import { mockOnCallSchedules, mockOnCallOverrides } from '@/src/mocks';

export const OnCall: React.FC = () => {
  const totalActive = mockOnCallSchedules.reduce((sum, s) => sum + s.activeIncidentCount, 0);
  const scheduleCount = mockOnCallSchedules.length;
  const pendingOverrides = mockOnCallOverrides.filter(o => o.status === 'pending').length;

  return (
    <div className="flex flex-col gap-8 py-6 px-6 max-w-screen-xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Phone size={18} className="text-ois-primary" />
            <h1 className="text-2xl font-bold text-ois-text tracking-tight">On-Call Management</h1>
          </div>
          <p className="text-sm text-ois-text-muted">
            {scheduleCount} active schedule{scheduleCount !== 1 ? 's' : ''}
            {' · '}
            {totalActive} active incident{totalActive !== 1 ? 's' : ''}
            {pendingOverrides > 0 && (
              <> · <span className="text-ois-warning font-medium">{pendingOverrides} pending override{pendingOverrides !== 1 ? 's' : ''}</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/on-call/schedule"
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-ois-btn bg-ois-surface-muted text-ois-text hover:bg-ois-border border border-ois-border transition-colors"
          >
            <CalendarDays size={15} />
            Schedule
          </Link>
          <Link
            to="/on-call/overrides"
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-ois-btn bg-ois-surface-muted text-ois-text hover:bg-ois-border border border-ois-border transition-colors"
          >
            <List size={15} />
            Overrides
            {pendingOverrides > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ois-warning text-white text-[10px] font-bold">
                {pendingOverrides}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Hero section */}
      <OnCallHeroSection schedules={mockOnCallSchedules} />

      {/* Upcoming handovers */}
      <UpcomingHandoversList
        schedules={mockOnCallSchedules}
        overrides={mockOnCallOverrides}
      />
    </div>
  );
};
