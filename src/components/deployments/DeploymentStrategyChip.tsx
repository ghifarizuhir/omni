import React from 'react';
import { deploymentStrategyMeta } from '../../lib/constants';
import { DeploymentStrategy } from '../../types/deployment';

interface DeploymentStrategyChipProps {
  strategy: DeploymentStrategy;
}

export const DeploymentStrategyChip: React.FC<DeploymentStrategyChipProps> = ({ strategy }) => {
  const meta = deploymentStrategyMeta[strategy];
  return (
    <span className="inline-flex items-center rounded-md font-medium text-[10px] px-2 py-0.5 bg-[#F1F3F7] text-[#475467]">
      {meta.label}
    </span>
  );
};
