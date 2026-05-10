import React from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, ArrowRight } from 'lucide-react';
import { TestRun } from '../../types/testing';

interface ActiveTestRunBannerProps {
  runs: TestRun[];
}

export const ActiveTestRunBanner: React.FC<ActiveTestRunBannerProps> = ({ runs }) => {
  if (runs.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#0BA5EC]/20 bg-[#F0F9FF] px-5 py-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical size={16} className="text-[#0BA5EC]" />
        <span className="text-sm font-bold text-[#0BA5EC]">
          {runs.length === 1
            ? '1 test run in progress'
            : `${runs.length} test runs in progress`}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {runs.map((run) => {
          const pct = run.totalCases > 0 ? Math.round((run.passedCount / run.totalCases) * 100) : 0;

          return (
            <div key={run.id} className="bg-white/70 rounded-lg px-4 py-3 border border-[#0BA5EC]/10">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-[#0BA5EC]">{run.publicId}</span>
                  <span className="text-[#475467] text-xs">/</span>
                  <span className="text-xs font-semibold text-[#101828] truncate">{run.testPlanName}</span>
                  <span className="font-mono text-[10px] bg-[#F1F3F7] text-[#475467] rounded px-1.5 py-0.5 uppercase">
                    {run.environment}
                  </span>
                </div>
                <Link
                  to={`/testing/runs/${run.publicId}`}
                  className="text-xs font-semibold text-[#0BA5EC] hover:underline flex items-center gap-1 shrink-0"
                >
                  View live <ArrowRight size={12} />
                </Link>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#475467]">
                    {run.passedCount} passed · {run.failedCount} failed · {run.pendingCount} pending
                  </span>
                  <span className="text-[11px] text-[#475467]">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0BA5EC]/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0BA5EC] transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
