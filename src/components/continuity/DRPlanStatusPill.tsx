import React from 'react';
import { cn } from '@/src/lib/utils';
import { DRPlanStatus } from '@/src/types/continuity';

interface Props {
  status: DRPlanStatus;
  className?: string;
}

const statusMeta: Record<DRPlanStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:        { label: 'Draft',        color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  approved:     { label: 'Approved',     color: '#1849A9', bg: '#EFF4FF', dot: '#2E90FA' },
  active:       { label: 'Active',       color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  under_review: { label: 'Under Review', color: '#B45309', bg: '#FFFAEB', dot: '#F79009' },
  retired:      { label: 'Retired',      color: '#98A2B3', bg: '#F9FAFB', dot: '#D0D5DD' },
};

export const DRPlanStatusPill: React.FC<Props> = ({ status, className }) => {
  const meta = statusMeta[status];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  );
};
