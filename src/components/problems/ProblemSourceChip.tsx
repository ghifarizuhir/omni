import React from 'react';
import {
  Activity, Siren, Lightbulb, ShieldCheck, User,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { problemSourceMeta } from '@/src/lib/constants';
import { ProblemSource } from '@/src/types/problem';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Activity, Siren, Lightbulb, ShieldCheck, User,
};

interface Props {
  source: ProblemSource;
  className?: string;
  showLabel?: boolean;
}

export const ProblemSourceChip: React.FC<Props> = ({ source, className, showLabel = true }) => {
  const meta = problemSourceMeta[source];
  const Icon = ICON_MAP[meta.icon] ?? Activity;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold',
        'bg-ois-surface-muted border border-ois-border text-ois-text-muted',
        className
      )}
      title={meta.description}
    >
      <Icon size={10} />
      {showLabel && meta.label}
    </span>
  );
};
