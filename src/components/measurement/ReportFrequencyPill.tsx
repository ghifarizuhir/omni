import React from 'react';
import { cn } from '@/src/lib/utils';
import { ReportFrequency } from '@/src/types/measurement';

interface ReportFrequencyPillProps {
  frequency: ReportFrequency;
}

const frequencyMeta: Record<ReportFrequency, { label: string; className: string }> = {
  on_demand:  { label: 'On Demand',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
  daily:      { label: 'Daily',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  weekly:     { label: 'Weekly',     className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  monthly:    { label: 'Monthly',    className: 'bg-purple-50 text-purple-700 border-purple-200' },
  quarterly:  { label: 'Quarterly',  className: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const UNKNOWN_META = { label: '—', className: 'bg-gray-50 text-gray-500 border-gray-200' };

export const ReportFrequencyPill: React.FC<ReportFrequencyPillProps> = ({ frequency }) => {
  const meta = frequencyMeta[frequency] ?? UNKNOWN_META;
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
      meta.className,
    )}>
      {meta.label}
    </span>
  );
};
