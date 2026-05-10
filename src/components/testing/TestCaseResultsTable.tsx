import React from 'react';
import { ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { TestRunCaseResult } from '../../types/testing';
import { testStepResultMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface TestCaseResultsTableProps {
  results: TestRunCaseResult[];
}

export const TestCaseResultsTable: React.FC<TestCaseResultsTableProps> = ({ results }) => {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ois-border">
          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle">Status</th>
          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle">Case ID</th>
          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle">Title</th>
          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle">Duration</th>
          <th className="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {results.map((result) => {
          const meta = testStepResultMeta[result.status];
          const Icon = (Icons as Record<string, React.FC<{ size?: number; className?: string }>>)[meta.icon];
          const isPending = result.status === 'pending';
          const isRunning = result.status === 'running';
          const showDuration = !isPending && !isRunning && result.durationSec > 0;

          return (
            <tr key={result.id} className="border-b border-ois-border/60 hover:bg-ois-surface-muted">
              <td className="px-3 py-2">
                <span className="flex items-center gap-1" style={{ color: meta.color }}>
                  {Icon && (
                    <Icon
                      size={14}
                      className={cn(isRunning && 'animate-spin')}
                    />
                  )}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="font-mono text-xs text-ois-text-muted">{result.testCasePublicId}</span>
              </td>
              <td className="px-3 py-2">
                <span className="text-xs text-ois-text">{result.testCaseTitle}</span>
              </td>
              <td className="px-3 py-2">
                <span className="text-xs text-ois-text-muted tabular-nums">
                  {showDuration ? `${result.durationSec}s` : '—'}
                </span>
              </td>
              <td className="px-3 py-2">
                <button className="p-1 rounded hover:bg-ois-border text-ois-text-subtle">
                  <ArrowRight size={12} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
