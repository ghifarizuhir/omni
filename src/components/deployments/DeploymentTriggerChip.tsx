import React from 'react';
import * as LucideIcons from 'lucide-react';
import { deploymentTriggerMeta } from '../../lib/constants';
import { DeploymentTrigger } from '../../types/deployment';

interface DeploymentTriggerChipProps {
  trigger: DeploymentTrigger;
  triggeredByName?: string;
}

export const DeploymentTriggerChip: React.FC<DeploymentTriggerChipProps> = ({
  trigger,
  triggeredByName,
}) => {
  const meta = deploymentTriggerMeta[trigger];
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[meta.icon];

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-flex items-center gap-1 rounded-md text-[10px] font-semibold px-2 py-0.5"
        style={{ color: meta.color, background: `${meta.color}18` }}
      >
        {IconComponent && <IconComponent size={10} />}
        {meta.label}
      </span>
      {triggeredByName && (
        <span className="text-[11px] text-[#475467]">{triggeredByName}</span>
      )}
    </span>
  );
};
