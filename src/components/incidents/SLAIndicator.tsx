import React from 'react';
import { cn } from '@/src/lib/utils';
import { slaStatusMeta } from '@/src/lib/constants';
import { SLAStatus } from '@/src/types/incident';

interface Props {
  responseStatus: SLAStatus;
  resolveStatus: SLAStatus;
  responseTarget: number;   // minutes
  resolveTarget: number;    // minutes
  firstResponseAt?: string; // ISO
  className?: string;
}

export const SLAIndicator: React.FC<Props> = ({
  responseStatus, resolveStatus,
  responseTarget, resolveTarget,
  firstResponseAt,
  className
}) => {
  const respMeta = slaStatusMeta[responseStatus];
  const resMeta = slaStatusMeta[resolveStatus];

  const responseTooltip = firstResponseAt
    ? `Response: ${respMeta.label} (target ${responseTarget}m)`
    : `Response: ${respMeta.label} (target ${responseTarget}m, not yet responded)`;
  const resolveTooltip = `Resolve: ${resMeta.label} (target ${resolveTarget}m)`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Response dot */}
      <div className="relative group flex items-center gap-1">
        <span className="text-[10px] text-ois-text-subtle leading-none">Resp</span>
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: respMeta.dot }}
          title={responseTooltip}
        />
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-ois-text text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          {responseTooltip}
        </div>
      </div>
      {/* Resolve dot */}
      <div className="relative group flex items-center gap-1">
        <span className="text-[10px] text-ois-text-subtle leading-none">Res</span>
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: resMeta.dot }}
          title={resolveTooltip}
        />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-ois-text text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          {resolveTooltip}
        </div>
      </div>
    </div>
  );
};
