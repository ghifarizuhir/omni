import React from 'react';
import { OnCallHeroSection } from '@/src/components/oncall/OnCallHeroSection';
import { UpcomingHandoversList } from '@/src/components/oncall/UpcomingHandoversList';
import { onCallService, useResource } from '@/src/services';

export const OnCall: React.FC = () => {
  const { data: schedulesData } = useResource(() => onCallService.schedules(), []);
  const { data: overridesData } = useResource(() => onCallService.overrides(), []);
  const schedules = schedulesData ?? [];
  const overrides = overridesData ?? [];

  return (
    <div className="flex flex-col gap-8 py-6 px-6 max-w-screen-xl mx-auto">
      <OnCallHeroSection schedules={schedules} />
      <UpcomingHandoversList
        schedules={schedules}
        overrides={overrides}
      />
    </div>
  );
};
