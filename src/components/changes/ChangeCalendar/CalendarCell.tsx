import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { Change } from '../../../types/change';
import { ChangePill } from './ChangePill';
import { DayDetailPopover } from './DayDetailPopover';

interface CalendarCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  changes: Change[];
  hasFreezeWindow?: boolean;
  hasConflict?: boolean;
}

export const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  isCurrentMonth,
  isToday,
  changes,
  hasFreezeWindow,
  hasConflict,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const visible = changes.slice(0, 3);
  const overflow = changes.length - 3;
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      className={cn(
        'relative min-h-[90px] p-1.5 border-r border-b border-ois-border text-xs transition-colors',
        !isCurrentMonth && 'bg-slate-50/60',
        isCurrentMonth && isWeekend && 'bg-slate-50/40',
        isCurrentMonth && !isWeekend && 'bg-white',
        isToday && 'bg-blue-50/60',
        hasFreezeWindow && !isToday && 'bg-amber-50/50',
        hasConflict && !isToday && 'bg-red-50/40',
      )}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold',
            isToday
              ? 'bg-ois-primary text-white'
              : isCurrentMonth
              ? 'text-ois-text'
              : 'text-ois-text-subtle',
          )}
        >
          {date.getDate()}
        </span>
        {hasConflict && (
          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1 rounded">
            ⚠
          </span>
        )}
      </div>

      {/* Change pills */}
      <div className="space-y-0.5">
        {visible.map((c) => (
          <ChangePill key={c.id} change={c} />
        ))}
        {overflow > 0 && (
          <button
            onClick={() => setShowPopover(true)}
            className="text-[10px] font-semibold text-ois-primary hover:underline ml-1"
          >
            +{overflow} more
          </button>
        )}
      </div>

      {showPopover && (
        <DayDetailPopover
          date={date}
          changes={changes}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
};
