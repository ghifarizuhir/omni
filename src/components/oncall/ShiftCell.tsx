import React from 'react';
import { cn } from '@/src/lib/utils';

interface ShiftCellProps {
  personName: string | null;
  isCurrentShift: boolean;
  isOverridden: boolean;
  isToday: boolean;
  date: Date;
}

function formatPersonLabel(name: string | null): string {
  if (!name) return '—';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${first} ${lastInitial}.`;
}

export const ShiftCell: React.FC<ShiftCellProps> = ({
  personName,
  isCurrentShift,
  isOverridden,
  isToday,
  date,
}) => {
  const dayNum = date.getUTCDate();

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center min-h-[56px] px-1 py-1.5 rounded-lg text-center transition-colors select-none',
        'border',
        isToday
          ? 'border-ois-primary bg-ois-primary/5'
          : 'border-transparent',
        isCurrentShift && !isToday
          ? 'bg-ois-success-pale/50'
          : !isToday
          ? 'bg-ois-surface-muted/40 hover:bg-ois-surface-muted'
          : '',
        !personName && 'opacity-40'
      )}
    >
      {/* Day number */}
      <span
        className={cn(
          'text-[10px] font-semibold mb-0.5 leading-none',
          isToday ? 'text-ois-primary' : 'text-ois-text-muted'
        )}
      >
        {dayNum}
      </span>

      {/* Person label */}
      <span
        className={cn(
          'text-[11px] font-medium leading-tight',
          isCurrentShift ? 'text-ois-success' : 'text-ois-text-subtle',
          isToday && 'text-ois-primary'
        )}
      >
        {formatPersonLabel(personName)}
      </span>

      {/* Override indicator */}
      {isOverridden && (
        <span className="absolute top-0.5 right-0.5 text-[8px] font-bold text-ois-warning bg-ois-warning-pale border border-[#F79009]/30 rounded px-0.5 leading-tight">
          OVR
        </span>
      )}
    </div>
  );
};
