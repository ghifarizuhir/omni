import React from 'react';
import { Check, X, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ReleaseStage } from '../../types/release';
import { stageStatusMeta } from '../../lib/constants';

const StatusNode: React.FC<{ status: ReleaseStage['status']; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const meta = stageStatusMeta[status];
  const sz = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSz = size === 'sm' ? 10 : 13;

  const bg =
    meta.nodeStyle === 'completed' ? 'bg-emerald-500' :
    meta.nodeStyle === 'active' ? 'bg-ois-primary animate-pulse' :
    meta.nodeStyle === 'failed' ? 'bg-ois-danger' :
    meta.nodeStyle === 'rollback' ? 'bg-orange-500' :
    'bg-ois-border';

  return (
    <div className={cn('rounded-full flex items-center justify-center shrink-0', sz, bg)}>
      {meta.nodeStyle === 'completed' && <Check size={iconSz} className="text-white" />}
      {meta.nodeStyle === 'active' && <Loader2 size={iconSz} className="text-white animate-spin" />}
      {meta.nodeStyle === 'failed' && <X size={iconSz} className="text-white" />}
      {meta.nodeStyle === 'rollback' && <RotateCcw size={iconSz} className="text-white" />}
      {(meta.nodeStyle === 'pending' || meta.nodeStyle === 'skipped') && (
        <div className={cn('rounded-full bg-white', size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5')} />
      )}
    </div>
  );
};

interface StagesMiniStepperProps {
  stages: ReleaseStage[];
  currentStageIndex: number;
  size?: 'sm' | 'md';
}

export const StagesMiniStepper: React.FC<StagesMiniStepperProps> = ({
  stages,
  currentStageIndex,
  size = 'md',
}) => (
  <div className="flex items-center">
    {stages.map((stage, i) => (
      <React.Fragment key={stage.id}>
        <div className="flex flex-col items-center gap-1">
          <StatusNode status={stage.status} size={size} />
          <span className={cn('capitalize text-center', size === 'sm' ? 'text-[9px]' : 'text-[10px]', 'text-ois-text-subtle')}>
            {stage.environment}
          </span>
        </div>
        {i < stages.length - 1 && (
          <div className={cn(
            'flex-1 mx-1 mb-3',
            size === 'sm' ? 'h-0.5' : 'h-0.5',
            i < currentStageIndex ? 'bg-emerald-400' : 'bg-ois-border',
          )} />
        )}
      </React.Fragment>
    ))}
  </div>
);
