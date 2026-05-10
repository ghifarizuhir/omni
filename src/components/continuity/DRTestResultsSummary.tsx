import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { DRTestRun } from '@/src/types/continuity';

interface Props {
  run: DRTestRun;
}

const MetricRow: React.FC<{
  label: string;
  achieved?: number;
  target?: number;
}> = ({ label, achieved, target }) => {
  if (achieved == null || target == null) return null;
  const met = achieved <= target;

  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
      )}
      <span className="text-gray-600">{label}:</span>
      <span className={`font-semibold ${met ? 'text-green-700' : 'text-red-700'}`}>
        {achieved} min
      </span>
      <span className="text-gray-400">(target {target} min)</span>
    </div>
  );
};

export const DRTestResultsSummary: React.FC<Props> = ({ run }) => {
  return (
    <div className="space-y-1.5">
      <MetricRow
        label="RTO"
        achieved={run.rtoAchievedMinutes}
        target={run.rtoTargetMinutes}
      />
      <MetricRow
        label="RPO"
        achieved={run.rpoAchievedMinutes}
        target={run.rpoTargetMinutes}
      />
      {run.issues.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
            {run.issues.length} issue{run.issues.length > 1 ? 's' : ''} found
          </span>
        </div>
      )}
    </div>
  );
};
