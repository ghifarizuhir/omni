import React from 'react';
import { CheckCircle, XCircle, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { cn } from '@/src/lib/utils';
import { DRTestStepResult } from '@/src/types/continuity';

interface Props {
  step: DRTestStepResult;
  isActive: boolean;
  onMarkPassed?: () => void;
  onMarkFailed?: () => void;
  onAddNote?: () => void;
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '—';
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function getRunningMinutes(startedAt?: string): number {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
}

export const DRTestStepRow: React.FC<Props> = ({
  step,
  isActive,
  onMarkPassed,
  onMarkFailed,
  onAddNote,
}) => {
  const statusIcon = {
    passed:      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />,
    failed:      <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
    in_progress: <Loader2 className="w-5 h-5 text-blue-500 shrink-0 animate-spin" />,
    pending:     <Circle className="w-5 h-5 text-gray-300 shrink-0" />,
    skipped:     <Circle className="w-5 h-5 text-gray-200 shrink-0" />,
  }[step.status];

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-3 py-3 rounded-lg transition-colors',
        isActive && 'bg-blue-50 border border-blue-200',
        !isActive && 'hover:bg-gray-50',
      )}
    >
      {statusIcon}

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">#{step.stepNumber}</span>
          <span className="text-sm font-semibold text-gray-900">{step.stepTitle}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {step.status === 'in_progress' && step.startedAt && (
            <span className="text-blue-600">
              running — {getRunningMinutes(step.startedAt)}m so far
            </span>
          )}
          {step.status !== 'in_progress' && step.durationMinutes != null && (
            <span>{formatDuration(step.durationMinutes)}</span>
          )}
          {step.executorName && <span>by {step.executorName}</span>}
        </div>

        {step.notes && (
          <p className="text-xs text-gray-600 italic">{step.notes}</p>
        )}

        {isActive && (
          <div className="flex items-center gap-2 mt-2">
            {onMarkPassed && (
              <Button variant="secondary" size="sm" onClick={onMarkPassed} className="gap-1 text-green-700">
                <CheckCircle className="w-3.5 h-3.5" />
                Mark passed
              </Button>
            )}
            {onMarkFailed && (
              <Button variant="secondary" size="sm" onClick={onMarkFailed} className="gap-1 text-red-700">
                <XCircle className="w-3.5 h-3.5" />
                Mark failed
              </Button>
            )}
            {onAddNote && (
              <Button variant="ghost" size="sm" onClick={onAddNote}>
                Add note
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
