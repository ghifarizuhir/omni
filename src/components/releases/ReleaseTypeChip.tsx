import React from 'react';
import { cn } from '../../lib/utils';
import { releaseTypeMeta } from '../../lib/constants';
import { ReleaseType } from '../../types/release';

interface ReleaseTypeChipProps {
  type: ReleaseType;
  size?: 'sm' | 'md';
}

export const ReleaseTypeChip: React.FC<ReleaseTypeChipProps> = ({ type, size = 'md' }) => {
  const meta = releaseTypeMeta[type];
  return (
    <span
      className={cn('inline-flex items-center rounded-md font-bold uppercase tracking-wider',
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
      )}
      style={{ color: meta.color, background: `${meta.color}18` }}
    >
      {meta.label}
    </span>
  );
};
