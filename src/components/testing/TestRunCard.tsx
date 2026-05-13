import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ArrowRight, CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';
import { TestRun } from '../../types/testing';
import { testRunStatusMeta } from '../../lib/constants';
import { TestRunStatusBadge } from './TestRunStatusBadge';
import { TestPassRateBar } from './TestPassRateBar';
import { FailureDetailCard } from './FailureDetailCard';
import { LiveTestRunDetail } from './LiveTestRunDetail';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface TestRunCardProps {
  run: TestRun;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const TestRunCard: React.FC<TestRunCardProps> = ({ run, isExpanded, onToggleExpand }) => {
  const meta = testRunStatusMeta[run.status];
  const isRunning = run.status === 'running';
  const isFailed = run.status === 'failed' || run.status === 'partial';
  const isPassed = run.status === 'passed';
  const canExpand = isRunning || isFailed || isPassed;

  const borderColor = isRunning
    ? '#0BA5EC'
    : isFailed
    ? '#F04438'
    : isPassed
    ? '#12B76A'
    : '#E4E7EC';

  return (
    <div
      className={cn('bg-ois-surface rounded-ois-card shadow-ois-card border overflow-hidden')}
      style={{ borderColor }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <TestRunStatusBadge status={run.status} />
          <span className="font-mono text-xs text-ois-text-muted">{run.publicId}</span>
        </div>

        <h3 className="text-base font-bold text-ois-text mb-0.5">{run.testPlanName}</h3>
        <p className="text-xs text-ois-text-muted mb-3">
          <span className="font-mono">{run.testPlanPublicId}</span>
          {' · '}
          <span className="uppercase font-semibold text-[10px]">{run.environment}</span>
          {' · '}
          {run.triggeredByName}
        </p>

        {run.linkedDeploymentPublicId && (
          <p className="text-xs text-ois-text-muted mb-3">
            Deployment:{' '}
            <Link
              to={`/deployments/${run.linkedDeploymentPublicId}`}
              className="font-mono text-ois-primary hover:underline"
            >
              {run.linkedDeploymentPublicId}
            </Link>
          </p>
        )}

        {!isPassed && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-ois-text-muted">
                {run.passedCount} / {run.totalCases} passed
              </span>
              <span className="text-[11px] text-ois-text-muted font-semibold">
                {Math.round(run.passRate * 100)}%
              </span>
            </div>
            <TestPassRateBar rate={run.passRate} />
          </div>
        )}

        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-[#067647]">
            <CheckCircle2 size={13} />
            {run.passedCount} passed
          </span>
          <span className="flex items-center gap-1 text-xs text-[#F04438]">
            <XCircle size={13} />
            {run.failedCount} failed
          </span>
          <span className="flex items-center gap-1 text-xs text-[#98A2B3]">
            <MinusCircle size={13} />
            {run.skippedCount} skipped
          </span>
          <span className="flex items-center gap-1 text-xs text-[#475467]">
            <Clock size={13} />
            {run.pendingCount} pending
          </span>
        </div>

        {isRunning && run.estimatedDurationMin > 0 && (
          <p className="text-xs text-[#0BA5EC] mb-3">
            Estimated remaining: ~{run.estimatedDurationMin} minutes
          </p>
        )}

        {isPassed && run.durationSec && (
          <p className="text-xs text-ois-text-muted mb-3">
            Completed in {Math.round(run.durationSec / 60)} min
          </p>
        )}

        {isFailed && run.topFailures && run.topFailures.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle">Top failures</p>
            {run.topFailures.slice(0, 2).map((f) => (
              <FailureDetailCard key={f.casePublicId} failure={f} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-ois-border">
          {canExpand && (
            <button
              className="flex items-center gap-1 text-xs font-semibold text-ois-text-muted hover:text-ois-text"
              onClick={onToggleExpand}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isExpanded ? 'Collapse' : 'Expand cases'}
            </button>
          )}
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onToggleExpand}>
              {isRunning ? 'View live' : 'View test run'} <ArrowRight size={11} />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && canExpand && <LiveTestRunDetail run={run} />}
    </div>
  );
};
