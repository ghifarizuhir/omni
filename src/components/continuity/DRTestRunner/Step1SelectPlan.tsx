import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { DRPlanStatusPill } from '../DRPlanStatusPill';
import { DRTestStatusPill } from '../DRTestStatusPill';
import { DRPlan } from '@/src/types/continuity';

interface Props {
  plans: DRPlan[];
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
}

const TODAY = new Date('2026-05-10');

function formatDate(isoString?: string): string {
  if (!isoString) return 'Never';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(isoString: string): boolean {
  return new Date(isoString) < TODAY;
}

export const Step1SelectPlan: React.FC<Props> = ({ plans, selectedPlanId, onSelect }) => {
  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const selected = plan.id === selectedPlanId;
        const reviewOverdue = isOverdue(plan.reviewDueAt);

        return (
          <label
            key={plan.id}
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              selected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="plan"
              value={plan.id}
              checked={selected}
              onChange={() => onSelect(plan.id)}
              className="mt-1 accent-blue-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
                <DRPlanStatusPill status={plan.status} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {plan.serviceNames.join(', ')}
              </p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-500">
                  Last tested: {formatDate(plan.lastTestedAt)}
                </span>
                {plan.lastTestStatus && (
                  <DRTestStatusPill status={plan.lastTestStatus} />
                )}
                {reviewOverdue && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    Review overdue
                  </span>
                )}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
};
