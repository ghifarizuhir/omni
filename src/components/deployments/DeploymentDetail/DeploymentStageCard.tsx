import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, MinusCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { stageStatusMeta_dep } from '../../../lib/constants';
import { DeploymentStage } from '../../../types/deployment';
import { formatRelative } from '../../../lib/format';

interface DeploymentStageCardProps {
  stage: DeploymentStage;
  isActive: boolean;
  isCompleted: boolean;
}

const iconMap = {
  CheckCircle2,
  XCircle,
  Loader2,
  MinusCircle,
  Circle,
};

export const DeploymentStageCard: React.FC<DeploymentStageCardProps> = ({
  stage,
  isActive,
  isCompleted,
}) => {
  const [expanded, setExpanded] = useState(isActive);
  const meta = stageStatusMeta_dep[stage.status];
  const IconComp = iconMap[meta.icon as keyof typeof iconMap] ?? Circle;

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isActive
          ? 'border-[#1F4FD4] shadow-[0_0_0_3px_rgba(31,79,212,0.12)] animate-pulse-border'
          : isCompleted
          ? 'border-[#12B76A]/30 bg-[#F6FEF9]'
          : stage.status === 'failed'
          ? 'border-[#F04438]/40 bg-[#FEF3F2]'
          : stage.status === 'skipped'
          ? 'border-[#E4E7EC] bg-[#F9FAFB] opacity-60'
          : 'border-[#E4E7EC] bg-white',
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <IconComp
            size={16}
            className={cn(stage.status === 'running' && 'animate-spin')}
            style={{ color: meta.color }}
          />
          <div>
            <span
              className={cn(
                'text-sm font-semibold',
                stage.status === 'skipped' && 'line-through text-[#98A2B3]',
                stage.status === 'failed' ? 'text-[#B42318]' : 'text-[#101828]',
              )}
            >
              {stage.name}
            </span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
              {stage.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && stage.completedAt && (
            <span className="text-[11px] text-[#667085]">{formatRelative(stage.completedAt)}</span>
          )}
          {isCompleted && stage.durationSec != null && (
            <span className="text-[11px] text-[#667085]">{stage.durationSec}s</span>
          )}
          {!isCompleted && stage.status === 'pending' && (
            <span className="text-[11px] text-[#98A2B3]">pending</span>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-[#98A2B3]" />
          ) : (
            <ChevronDown size={14} className="text-[#98A2B3]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-[#F2F4F7]">
          {isActive && stage.progressPercent != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
                <span>{stage.progressLabel ?? 'In progress…'}</span>
                <span>{stage.progressPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E4E7EC] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1F4FD4] transition-all duration-700"
                  style={{ width: `${stage.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {stage.errorMessage && (
            <div className="mt-3 rounded bg-[#FEF3F2] px-3 py-2 font-mono text-xs text-[#B42318]">
              {stage.errorMessage}
            </div>
          )}

          {!stage.errorMessage && !isActive && (
            <p className="mt-3 text-xs text-[#667085]">
              {stage.status === 'skipped'
                ? 'Stage was skipped.'
                : stage.status === 'pending'
                ? 'Waiting to start.'
                : stage.completedAt
                ? `Completed ${formatRelative(stage.completedAt)}`
                : 'No additional details.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
