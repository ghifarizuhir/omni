import React from 'react';
import { cn } from '../../../lib/utils';
import { formatRelative } from '../../../lib/format';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { DeploymentStatusPill } from '../DeploymentStatusPill';
import { EnvironmentChip } from '../EnvironmentChip';
import { DeploymentStrategyChip } from '../DeploymentStrategyChip';
import { DeploymentTriggerChip } from '../DeploymentTriggerChip';
import { Deployment } from '../../../types/deployment';
import { RotateCcw, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface DeploymentHeroProps {
  deployment: Deployment;
  onRollback?: () => void;
  onCancel?: () => void;
  onRedeploy?: () => void;
}

const gradients: Record<string, string> = {
  running:      'from-[#EEF2FF] to-white',
  success:      'from-[#ECFDF3] to-white',
  failed:       'from-[#FEF3F2] to-white',
  rolled_back:  'from-[#FFFAEB] to-white',
  rolling_back: 'from-[#FFFAEB] to-white',
  cancelled:    'from-[#F1F3F7] to-white',
  pending:      'from-[#F1F3F7] to-white',
};

export const DeploymentHero: React.FC<DeploymentHeroProps> = ({
  deployment,
  onRollback,
  onCancel,
  onRedeploy,
}) => {
  const { status, stages, currentStageIndex } = deployment;
  const totalStages = stages.length;
  const progressPercent = totalStages > 0 ? Math.round((currentStageIndex / totalStages) * 100) : 0;
  const currentStage = stages[currentStageIndex];
  const failedStage = stages.find((s) => s.status === 'failed');

  const version = deployment.artifactRef.includes(':')
    ? deployment.artifactRef.split(':').pop()
    : deployment.artifactRef;

  const isRunning = status === 'running' || status === 'rolling_back';
  const canRollback = status === 'running' || status === 'success';
  const canCancel = status === 'pending' || status === 'running';
  const canRedeploy = status === 'failed' || status === 'rolled_back';

  return (
    <div className={cn('bg-gradient-to-b rounded-xl border border-[#EAECF0] px-6 py-5', gradients[status] ?? 'from-[#F1F3F7] to-white')}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xl font-bold text-[#101828]">{deployment.publicId}</span>
              {isRunning && (
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#0BA5EC] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#0BA5EC] animate-pulse" />
                  LIVE
                </span>
              )}
              <DeploymentStatusPill status={status} size="md" hasIncident={deployment.triggeredIncidentIds.length > 0} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#344054]">{deployment.componentName}</span>
              <span className="font-mono text-xs bg-[#F1F3F7] text-[#475467] rounded px-2 py-0.5">
                {version}
              </span>
              <span className="text-[#98A2B3]">→</span>
              <EnvironmentChip env={deployment.environment} size="md" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DeploymentTriggerChip trigger={deployment.trigger} triggeredByName={deployment.triggeredByName} />
              <DeploymentStrategyChip strategy={deployment.strategy} />
              {deployment.linkedReleasePublicId && (
                <Badge variant="status">REL {deployment.linkedReleasePublicId}</Badge>
              )}
              {deployment.linkedChangePublicId && (
                <Badge variant="neutral">CHG {deployment.linkedChangePublicId}</Badge>
              )}
            </div>
            {deployment.startedAt && (
              <div className="text-xs text-[#667085]">
                Started {formatRelative(deployment.startedAt)}
                {deployment.durationSec != null && ` · ${deployment.durationSec}s`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {canRollback && onRollback && (
              <Button size="sm" variant="destructive" onClick={onRollback}>
                <RotateCcw size={13} className="mr-1" /> Rollback
              </Button>
            )}
            {canCancel && onCancel && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                <XCircle size={13} className="mr-1" /> Cancel
              </Button>
            )}
            {canRedeploy && onRedeploy && (
              <Button size="sm" variant="secondary" onClick={onRedeploy}>
                <RefreshCw size={13} className="mr-1" /> Re-deploy
              </Button>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 text-xs text-[#667085]">
            <span>
              Stage {currentStageIndex + 1} of {totalStages}
              {currentStage ? ` · ${currentStage.name}` : ''}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#E4E7EC] overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                status === 'success' ? 'bg-[#12B76A]' : status === 'failed' ? 'bg-[#F04438]' : 'bg-[#1F4FD4]',
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {status === 'failed' && failedStage && (
          <div className="flex items-start gap-2 rounded-lg bg-[#FEF3F2] border border-[#F04438]/20 px-4 py-3">
            <AlertTriangle size={14} className="text-[#F04438] mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-[#B42318]">
                Failed at: {failedStage.name}
              </span>
              {failedStage.errorMessage && (
                <p className="text-xs text-[#B42318] mt-0.5 font-mono">{failedStage.errorMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
