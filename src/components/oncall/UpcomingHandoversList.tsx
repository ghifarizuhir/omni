import React from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Card } from '@/src/components/ui/Card';
import { OnCallSchedule, OnCallOverride } from '@/src/types/platform';

interface HandoverEvent {
  scheduleName: string;
  teamName: string;
  date: Date;
  fromName: string;
  toName: string;
  isOverride: boolean;
}

interface UpcomingHandoversListProps {
  schedules: OnCallSchedule[];
  overrides: OnCallOverride[];
}

const TODAY = new Date('2026-05-10T00:00:00Z');
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const WINDOW_END = new Date(TODAY.getTime() + SEVEN_DAYS);

function formatHandoverDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

export const UpcomingHandoversList: React.FC<UpcomingHandoversListProps> = ({
  schedules,
  overrides,
}) => {
  const handovers: HandoverEvent[] = [];

  // Collect shift handovers
  for (const schedule of schedules) {
    const shifts = schedule.upcomingShifts;
    for (let i = 0; i < shifts.length - 1; i++) {
      const current = shifts[i];
      const next = shifts[i + 1];
      const handoverDate = new Date(current.endAt);
      if (handoverDate >= TODAY && handoverDate <= WINDOW_END) {
        handovers.push({
          scheduleName: schedule.name,
          teamName: schedule.teamName,
          date: handoverDate,
          fromName: current.userName,
          toName: next.userName,
          isOverride: false,
        });
      }
    }
  }

  // Collect override events in window
  for (const override of overrides) {
    if (override.status !== 'approved') continue;
    const start = new Date(override.startAt);
    const end = new Date(override.endAt);
    // Show if override starts within the window
    if (start >= TODAY && start <= WINDOW_END) {
      handovers.push({
        scheduleName: override.scheduleName,
        teamName: '',
        date: start,
        fromName: override.originalUserName,
        toName: override.overrideUserName,
        isOverride: true,
      });
    }
    // Show handover back when override ends
    if (end >= TODAY && end <= WINDOW_END) {
      handovers.push({
        scheduleName: override.scheduleName,
        teamName: '',
        date: end,
        fromName: override.overrideUserName,
        toName: override.originalUserName,
        isOverride: true,
      });
    }
  }

  // Sort by date
  handovers.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <section>
      <h2 className="text-[11px] font-semibold tracking-widest uppercase text-ois-text-muted mb-4">
        Upcoming Handovers (Next 7 Days)
      </h2>
      <Card>
        {handovers.length === 0 ? (
          <div className="px-5 py-10 text-center text-ois-text-muted text-sm">
            No handovers in the next 7 days.
          </div>
        ) : (
          <ul className="divide-y divide-ois-border">
            {handovers.map((h, idx) => (
              <li key={idx} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ois-surface-muted shrink-0">
                  <Calendar size={14} className={h.isOverride ? 'text-ois-warning' : 'text-ois-primary'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ois-text">{formatHandoverDate(h.date)}</span>
                    {h.isOverride && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-ois-warning-pale text-ois-warning border border-[#F79009]/20">
                        OVERRIDE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-ois-text-muted">
                    <span className="font-medium text-ois-text-subtle">{h.scheduleName}</span>
                    <span className="text-ois-border">·</span>
                    <span>{h.fromName}</span>
                    <ArrowRight size={11} className="text-ois-text-muted shrink-0" />
                    <span className="font-medium text-ois-text">{h.toName}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
};
