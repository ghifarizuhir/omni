import React, { useState, useEffect } from 'react';
import { TestRun, TestRunCaseResult, TestStepResultStatus } from '../../types/testing';
import { TestCaseResultsTable } from './TestCaseResultsTable';
import { TestPassRateBar } from './TestPassRateBar';
import { formatRelative } from '../../lib/format';

interface LiveTestRunDetailProps {
  run: TestRun;
}

export const LiveTestRunDetail: React.FC<LiveTestRunDetailProps> = ({ run }) => {
  const [results, setResults] = useState<TestRunCaseResult[]>(run.caseResults);

  useEffect(() => {
    if (run.status !== 'running') return;

    const interval = setInterval(() => {
      setResults((prev) => {
        const next = [...prev];
        const runningIdx = next.findIndex((r) => r.status === 'running');
        if (runningIdx !== -1) {
          next[runningIdx] = { ...next[runningIdx], status: 'passed' as TestStepResultStatus };
        }
        const pendingIdx = next.findIndex((r) => r.status === 'pending');
        if (pendingIdx !== -1) {
          next[pendingIdx] = { ...next[pendingIdx], status: 'running' as TestStepResultStatus };
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [run.status]);

  const passed = results.filter((r) => r.status === 'passed').length;
  const total = results.length;
  const rate = total > 0 ? passed / total : 0;

  const elapsed = run.startedAt ? formatRelative(run.startedAt) : '—';
  const eta = run.status === 'running' && run.estimatedDurationMin
    ? `~${run.estimatedDurationMin} min`
    : run.completedAt
    ? formatRelative(run.completedAt)
    : '—';

  return (
    <div className="border-t border-ois-border bg-ois-surface-muted px-5 py-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <TestPassRateBar rate={rate} showLabel />
        </div>
        <span className="text-xs text-ois-text-muted shrink-0">
          Elapsed: {elapsed}
        </span>
        <span className="text-xs text-ois-text-muted shrink-0">
          ETA: {eta}
        </span>
      </div>
      <TestCaseResultsTable results={results} />
    </div>
  );
};
