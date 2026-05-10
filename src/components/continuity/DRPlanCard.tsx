import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Play, List, ExternalLink } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { DRPlanStatusPill } from './DRPlanStatusPill';
import { DRTestStatusPill } from './DRTestStatusPill';
import { drTestStatusMeta } from '@/src/lib/constants';
import { DRPlan } from '@/src/types/continuity';

interface Props {
  plan: DRPlan;
  onTestNow: (plan: DRPlan) => void;
  onOpenDetail: (plan: DRPlan) => void;
}

const TODAY = new Date('2026-05-10');

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(isoString: string): boolean {
  return new Date(isoString) < TODAY;
}

export const DRPlanCard: React.FC<Props> = ({ plan, onTestNow, onOpenDetail }) => {
  const [showAllTriggers, setShowAllTriggers] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const totalEstMinutes = plan.recoverySteps.reduce((acc, s) => acc + s.estimatedMinutes, 0);
  const reviewOverdue = isOverdue(plan.reviewDueAt);
  const TRIGGER_PREVIEW = 2;
  const extraTriggers = plan.triggerConditions.length - TRIGGER_PREVIEW;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <DRPlanStatusPill status={plan.status} />
        <span className="font-mono text-xs text-gray-400">{plan.publicId}</span>
      </div>

      {/* Name + version */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{plan.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Covers: {plan.serviceNames.join(', ')}
          </p>
        </div>
        <span className="text-xs text-gray-400 shrink-0 font-mono">{plan.version}</span>
      </div>

      {/* Trigger conditions */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Trigger Conditions ({plan.triggerConditions.length})
        </p>
        <ul className="space-y-1">
          {(showAllTriggers
            ? plan.triggerConditions
            : plan.triggerConditions.slice(0, TRIGGER_PREVIEW)
          ).map((cond, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-gray-400 mt-0.5">•</span>
              {cond}
            </li>
          ))}
        </ul>
        {extraTriggers > 0 && (
          <button
            onClick={() => setShowAllTriggers((v) => !v)}
            className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            {showAllTriggers ? (
              <>Show fewer <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>{extraTriggers} more <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>

      {/* Recovery steps summary */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recovery Steps: {plan.recoverySteps.length} steps · Est. {totalEstMinutes} min total
          </p>
          <button
            onClick={() => setShowSteps((v) => !v)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            {showSteps ? 'Hide' : 'View steps'}
            {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-green-500 w-full" title="100% — on paper" />
      </div>

      {showSteps && (
        <div className="pt-1 border-t border-gray-100">
          {plan.recoverySteps.map((step) => (
            <div key={step.id} className="flex items-start gap-2 py-1.5">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                {step.stepNumber}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">{step.title}</p>
                <p className="text-xs text-gray-400">{step.estimatedMinutes} min · {step.owner}</p>
              </div>
              {step.critical && (
                <span className="text-[10px] font-bold text-red-700 bg-red-50 rounded px-1.5 py-0.5 shrink-0">
                  Critical
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Test status */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Test Status</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">
            Last tested: {plan.lastTestedAt ? formatDate(plan.lastTestedAt) : 'Never'}
          </span>
          {plan.lastTestStatus && <DRTestStatusPill status={plan.lastTestStatus} />}
        </div>
        {plan.lastTestStatus === 'passed_with_issues' && (
          <p className="text-xs text-amber-600 mt-1">Some issues were found — review recommended.</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        {plan.biaEntryIds.length > 0 && (
          <span>
            Linked BIA:{' '}
            <span className="font-mono text-gray-700">{plan.biaEntryIds[0]}</span>
          </span>
        )}
        <span className={reviewOverdue ? 'text-amber-600 font-medium' : ''}>
          {reviewOverdue && <AlertTriangle className="inline w-3 h-3 mr-1" />}
          Review due: {formatDate(plan.reviewDueAt)}
        </span>
        {plan.approvedByName && (
          <span>
            Approved: {plan.approvedByName} · {plan.approvedAt ? formatDate(plan.approvedAt) : '—'}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        <Button variant="primary" size="sm" onClick={() => onTestNow(plan)} className="gap-1">
          <Play className="w-3.5 h-3.5" />
          Test now
        </Button>
        <Button variant="secondary" size="sm" className="gap-1" onClick={() => setShowSteps((v) => !v)}>
          <List className="w-3.5 h-3.5" />
          View steps
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenDetail(plan)} className="gap-1 ml-auto">
          Open detail
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
