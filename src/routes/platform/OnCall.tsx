import React from 'react';
import { OnCallHeroSection } from '@/src/components/oncall/OnCallHeroSection';
import { UpcomingHandoversList } from '@/src/components/oncall/UpcomingHandoversList';
import { mockOnCallSchedules, mockOnCallOverrides } from '@/src/mocks';

export const OnCall: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 py-6 px-6 max-w-screen-xl mx-auto">
      <OnCallHeroSection schedules={mockOnCallSchedules} />
      <UpcomingHandoversList
        schedules={mockOnCallSchedules}
        overrides={mockOnCallOverrides}
      />
    </div>
  );
};
