import React from 'react';
import { Link } from 'react-router-dom';
import { User, Users, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Card } from '@/src/components/ui/Card';
import { OnCallSchedule } from '@/src/types/platform';

interface OnCallScheduleCardProps {
  schedule: OnCallSchedule;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getShiftRemaining(endAt: string): string {
  const now = new Date('2026-05-10T12:00:00Z');
  const end = new Date(endAt);
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 'Ended';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays >= 1) return `${diffDays}d ${diffHours % 24}h remaining`;
  return `${diffHours}h remaining`;
}

export const OnCallScheduleCard: React.FC<OnCallScheduleCardProps> = ({ schedule }) => {
  // Find the current primary shift for end time
  const currentShift = schedule.upcomingShifts.find(
    s => s.userId === schedule.currentPrimaryId && s.isCurrentShift
  );

  return (
    <Card className="flex flex-col gap-0 divide-y divide-ois-border">
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase text-ois-text-muted mb-0.5">
              {schedule.teamName}
            </p>
            <h3 className="text-base font-bold text-ois-text leading-tight">{schedule.name}</h3>
          </div>
          {schedule.activeIncidentCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ois-danger-pale text-ois-danger text-[11px] font-semibold border border-ois-danger/20 shrink-0">
              <AlertCircle size={11} />
              {schedule.activeIncidentCount} active
            </span>
          )}
        </div>
      </div>

      {/* Primary */}
      <div className="px-5 py-4 bg-ois-success-pale/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-ois-success shrink-0" />
          <span className="text-[10px] font-semibold tracking-widest uppercase text-ois-success">Primary</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            'bg-ois-primary text-white text-sm font-bold'
          )}>
            {getInitials(schedule.currentPrimaryName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ois-text">{schedule.currentPrimaryName}</p>
            {currentShift && (
              <p className="text-xs text-ois-text-muted truncate">
                {new Date(currentShift.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {new Date(currentShift.endAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Secondary (optional) */}
      {schedule.currentSecondaryName && (
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-ois-info shrink-0" />
            <span className="text-[10px] font-semibold tracking-widest uppercase text-ois-info">Secondary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-ois-info/20 text-ois-info flex items-center justify-center text-xs font-bold shrink-0">
              {getInitials(schedule.currentSecondaryName)}
            </div>
            <span className="text-sm text-ois-text">{schedule.currentSecondaryName}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between bg-ois-surface-muted/50">
        <div className="flex items-center gap-1.5 text-xs text-ois-text-muted">
          <Clock size={12} />
          {currentShift ? getShiftRemaining(currentShift.endAt) : 'Shift info unavailable'}
        </div>
        {schedule.activeIncidentCount > 0 && (
          <Link
            to="/incidents"
            className="inline-flex items-center gap-1 text-xs font-medium text-ois-primary hover:underline"
          >
            View incidents
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </Card>
  );
};
