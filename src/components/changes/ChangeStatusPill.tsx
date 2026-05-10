import React from 'react';
import { cn } from '../../lib/utils';
import { changeStatusMeta } from '../../lib/constants';
import { ChangeStatus } from '../../types/change';

interface ChangeStatusPillProps {
  status: ChangeStatus;
  size?: 'sm' | 'md';
}

export const ChangeStatusPill: React.FC<ChangeStatusPillProps> = ({ status, size = 'md' }) => {
  const meta = changeStatusMeta[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      )}
      style={{ color: meta.color, background: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
};
