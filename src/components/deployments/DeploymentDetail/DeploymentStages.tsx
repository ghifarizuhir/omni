import React from 'react';
import { DeploymentStageCard } from './DeploymentStageCard';
import { DeploymentStage } from '../../../types/deployment';

interface DeploymentStagesProps {
  stages: DeploymentStage[];
  currentStageIndex: number;
}

export const DeploymentStages: React.FC<DeploymentStagesProps> = ({ stages, currentStageIndex }) => {
  return (
    <div className="flex flex-col gap-0">
      {stages.map((stage, idx) => (
        <div key={stage.id} className="relative">
          <DeploymentStageCard
            stage={stage}
            isActive={idx === currentStageIndex && stage.status === 'running'}
            isCompleted={stage.status === 'success'}
          />
          {idx < stages.length - 1 && (
            <div className="flex justify-center">
              <div className="w-px h-4 bg-[#E4E7EC]" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
