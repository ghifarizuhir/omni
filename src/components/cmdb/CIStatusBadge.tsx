import React from 'react';
import { CIStatus } from '../../types/ci';
import { ciStatusMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface CIStatusBadgeProps {
  status: CIStatus;
  className?: string;
}

export const CIStatusBadge: React.FC<CIStatusBadgeProps> = ({ status, className }) => {
  const meta = ciStatusMeta[status] || ciStatusMeta.unknown;

  return (
    <span 
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        className
      )}
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
};
