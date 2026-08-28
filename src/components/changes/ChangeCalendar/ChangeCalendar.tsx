import React, { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, isSameDay, addMonths, subMonths, format,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { CalendarCell } from './CalendarCell';
import { Change } from '../../../types/change';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// freeze window: May 9–11 2026
const isFreezeDay = (d: Date) => {
  const month = d.getMonth(); // 4 = May
  const day = d.getDate();
  return month === 4 && day >= 9 && day <= 11;
};

interface ChangeCalendarProps {
  changes: Change[];
}

export const ChangeCalendar: React.FC<ChangeCalendarProps> = ({ changes }) => {
  const [viewDate, setViewDate] = useState(new Date('2026-05-09'));

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    // start on Monday
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewDate]);

  const changesByDay = useMemo(() => {
    const map: Record<string, Change[]> = {};
    changes.forEach((c) => {
      const key = format(new Date(c.plannedStart), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [changes]);

  const today = new Date('2026-05-09');

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewDate(subMonths(viewDate, 1))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-bold text-ois-text w-32 text-center">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewDate(addMonths(viewDate, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewDate(today)}>
          Today
        </Button>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-ois-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Low</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />High</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-l border-t border-ois-border rounded-t-lg overflow-hidden">
        {DAYS.map((d) => (
          <div key={d} className="bg-ois-bg border-r border-b border-ois-border px-2 py-2 text-[11px] font-bold text-ois-text-muted text-center tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-ois-border flex-1 rounded-b-lg overflow-hidden">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayChanges = changesByDay[key] ?? [];
          const hasConflict = dayChanges.some((c) => (c.conflicts ?? []).length > 0);
          return (
            <CalendarCell
              key={key}
              date={day}
              isCurrentMonth={isSameMonth(day, viewDate)}
              isToday={isSameDay(day, today)}
              changes={dayChanges}
              hasFreezeWindow={isFreezeDay(day)}
              hasConflict={hasConflict}
            />
          );
        })}
      </div>
    </div>
  );
};
