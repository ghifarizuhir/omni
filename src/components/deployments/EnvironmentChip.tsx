import React from 'react';
import { cn } from '../../lib/utils';
import { environmentMeta } from '../../lib/constants';
import { Environment } from '../../types/ci';

interface EnvironmentChipProps {
  env: Environment;
  size?: 'sm' | 'md';
}

export const EnvironmentChip: React.FC<EnvironmentChipProps> = ({ env, size = 'md' }) => {
  const meta = environmentMeta[env];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-bold uppercase tracking-wider',
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
      )}
      style={{ color: meta.color, background: meta.bg }}
    >
      {size === 'sm' ? meta.shortLabel : meta.label}
    </span>
  );
};
