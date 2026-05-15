import React, { useMemo } from 'react';
import { OnCallSchedule, OnCallOverride } from '@/src/types/platform';
import { ShiftCell } from './ShiftCell';

interface ShiftCalendarGridProps {
  schedule: OnCallSchedule;
  overrides: OnCallOverride[];
}

const DAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function isoDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
}

function getWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${startStr} – ${endStr}`;
}

interface DayCellInfo {
  date: Date;
  personName: string | null;
  isCurrentShift: boolean;
  isOverridden: boolean;
}

export const ShiftCalendarGrid: React.FC<ShiftCalendarGridProps> = ({ schedule, overrides }) => {
  const calendarStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - dow);
    return d;
  }, []);

  const todayStr = useMemo(() => isoDateStr(new Date()), []);

  // Build 4 weeks
  const weeks: DayCellInfo[][] = [];

  for (let w = 0; w < 4; w++) {
    const weekDays: DayCellInfo[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(calendarStart, w * 7 + d);
      const dayStart = date; // midnight UTC
      const dayEnd = addDays(date, 1);

      // Check if an approved override covers this day for this schedule
      const applicableOverride = overrides.find(ov => {
        if (ov.scheduleId !== schedule.id) return false;
        if (ov.status !== 'approved') return false;
        const ovStart = new Date(ov.startAt);
        const ovEnd = new Date(ov.endAt);
        return ovStart <= dayStart && dayEnd <= ovEnd;
      });

      let personName: string | null = null;
      let isCurrentShift = false;
      let isOverridden = false;

      if (applicableOverride) {
        personName = applicableOverride.overrideUserName;
        isOverridden = true;
        isCurrentShift = false;
      } else {
        // Find shift covering this day
        const shift = schedule.upcomingShifts.find(s => {
          const shiftStart = new Date(s.startAt);
          const shiftEnd = new Date(s.endAt);
          return shiftStart <= dayStart && dayEnd <= shiftEnd && s.shiftType === 'primary';
        });
        if (shift) {
          personName = shift.userName;
          isCurrentShift = shift.isCurrentShift;
        }
      }

      weekDays.push({ date, personName, isCurrentShift, isOverridden });
    }
    weeks.push(weekDays);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Day headers */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
          <div /> {/* Week label spacer */}
          {DAY_HEADERS.map(day => (
            <div key={day} className="text-center text-[10px] font-semibold tracking-widest uppercase text-ois-text-muted py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
            {/* Week label */}
            <div className="flex items-center justify-end pr-2">
              <span className="text-[10px] text-ois-text-muted font-medium leading-tight text-right">
                {getWeekLabel(week[0].date)}
              </span>
            </div>
            {week.map((cell, di) => (
              <ShiftCell
                key={di}
                date={cell.date}
                personName={cell.personName}
                isCurrentShift={cell.isCurrentShift}
                isOverridden={cell.isOverridden}
                isToday={isoDateStr(cell.date) === todayStr}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-ois-text-muted">
            <span className="w-3 h-3 rounded bg-ois-success-pale/50 border border-ois-success/30 inline-block" />
            Current shift
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-ois-text-muted">
            <span className="w-3 h-3 rounded border-2 border-ois-primary inline-block" />
            Today
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-ois-text-muted">
            <span className="inline-block text-[8px] font-bold text-ois-warning bg-ois-warning-pale border border-[#F79009]/30 rounded px-0.5">OVR</span>
            Override
          </div>
        </div>
      </div>
    </div>
  );
};
