import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { DRPlanStep } from '@/src/types/continuity';

interface Props {
  steps: DRPlanStep[];
  totalEstimatedMinutes?: number;
}

const StepItem: React.FC<{ step: DRPlanStep }> = ({ step }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-3">
      {/* Step number circle */}
      <div className="shrink-0 flex flex-col items-center">
        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
          {step.stepNumber}
        </span>
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{step.title}</p>
          {step.critical && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
              Critical
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{step.estimatedMinutes} min</span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-1 space-y-1.5">
            <p className="text-sm text-gray-600">{step.description}</p>
            {step.verificationCriteria && (
              <p className="text-xs italic text-gray-500">
                Verification: {step.verificationCriteria}
              </p>
            )}
            <p className="text-xs text-gray-400">Owner: {step.owner}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const DRPlanStepsViewer: React.FC<Props> = ({ steps, totalEstimatedMinutes }) => {
  const total =
    totalEstimatedMinutes ?? steps.reduce((acc, s) => acc + s.estimatedMinutes, 0);

  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const durationLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return (
    <div>
      <div className="space-y-0">
        {steps.map((step) => (
          <StepItem key={step.id} step={step} />
        ))}
      </div>
      <div className="mt-2 pt-3 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">{steps.length} steps total</span>
        <span className="text-xs font-semibold text-gray-700">
          Est. total: {durationLabel}
        </span>
      </div>
    </div>
  );
};
