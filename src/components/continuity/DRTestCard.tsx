import React from 'react';
import { Play, FileText } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { DRTestStatusPill } from './DRTestStatusPill';
import { DRTestTypeChip } from './DRTestTypeChip';
import { DRTestResultsSummary } from './DRTestResultsSummary';
import { DRTestRun } from '@/src/types/continuity';

interface Props {
  run: DRTestRun;
  onViewLive?: (run: DRTestRun) => void;
  onViewReport?: (run: DRTestRun) => void;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export const DRTestCard: React.FC<Props> = ({ run, onViewLive, onViewReport }) => {
  const progressPct = run.totalSteps > 0 ? Math.round((run.completedSteps / run.totalSteps) * 100) : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <DRTestStatusPill status={run.status} />
        <span className="font-mono text-xs text-gray-400">{run.publicId}</span>
      </div>

      {/* Plan name + type */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-semibold text-gray-900">{run.planName}</p>
        <DRTestTypeChip type={run.type} />
      </div>

      {/* Duration info */}
      <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
        {run.startedAt && <span>Started: {formatDate(run.startedAt)}</span>}
        {run.durationMinutes != null && <span>Duration: {formatDuration(run.durationMinutes)}</span>}
        <span>{run.environment}</span>
      </div>

      {/* Progress (in_progress only) */}
      {run.status === 'in_progress' && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>
              Steps {run.completedSteps}/{run.totalSteps}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* RTO/RPO results */}
      {(run.status === 'passed' || run.status === 'passed_with_issues' || run.status === 'failed') && (
        <DRTestResultsSummary run={run} />
      )}

      {/* Issues summary */}
      {run.issues.length > 0 && (
        <p className="text-xs text-amber-600">
          {run.issues.length} issue{run.issues.length > 1 ? 's' : ''} found
          {run.issues.filter((i) => i.severity === 'critical').length > 0 &&
            ` · ${run.issues.filter((i) => i.severity === 'critical').length} critical`}
        </p>
      )}

      {/* Lessons learned */}
      {run.lessonsLearned && (
        <p className="text-xs text-gray-600 italic line-clamp-2">
          Lessons: {run.lessonsLearned}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        {run.status === 'in_progress' && onViewLive && (
          <Button variant="primary" size="sm" onClick={() => onViewLive(run)} className="gap-1">
            <Play className="w-3.5 h-3.5" />
            View live
          </Button>
        )}
        {(run.status === 'passed' || run.status === 'passed_with_issues' || run.status === 'failed') &&
          onViewReport && (
            <Button variant="secondary" size="sm" onClick={() => onViewReport(run)} className="gap-1">
              <FileText className="w-3.5 h-3.5" />
              View full report
            </Button>
          )}
      </div>
    </div>
  );
};
