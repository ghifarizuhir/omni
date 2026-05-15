import React from 'react';
import { OnCallSchedule } from '@/src/types/platform';
import { OnCallScheduleCard } from './OnCallScheduleCard';

interface OnCallHeroSectionProps {
  schedules: OnCallSchedule[];
}

export const OnCallHeroSection: React.FC<OnCallHeroSectionProps> = ({ schedules }) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-[11px] font-semibold tracking-widest uppercase text-ois-text-muted">
          Who's On Call Right Now
        </h2>
        <span className="text-xs text-ois-text-muted">
          {dateStr} · {timeStr}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {schedules.map(schedule => (
          <OnCallScheduleCard key={schedule.id} schedule={schedule} />
        ))}
      </div>
    </section>
  );
};
