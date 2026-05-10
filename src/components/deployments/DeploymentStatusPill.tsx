import React from 'react';
import { cn } from '../../lib/utils';
import { deploymentStatusMeta } from '../../lib/constants';
import { DeploymentStatus } from '../../types/deployment';

interface DeploymentStatusPillProps {
  status: DeploymentStatus;
  size?: 'sm' | 'md';
  hasIncident?: boolean;
}

export const DeploymentStatusPill: React.FC<DeploymentStatusPillProps> = ({
  status,
  size = 'md',
  hasIncident,
}) => {
  const meta = deploymentStatusMeta[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold',
          size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        )}
        style={{ color: meta.color, background: meta.bg }}
      >
        <span
          className={cn('w-1.5 h-1.5 rounded-full', meta.animated && 'animate-pulse')}
          style={{ background: meta.dot }}
        />
        {meta.label}
      </span>
      {hasIncident && (
        <span className="inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-2 py-0.5 bg-[#FEF3F2] text-[#B42318]">
          ⚠ caused incident
        </span>
      )}
    </span>
  );
};
