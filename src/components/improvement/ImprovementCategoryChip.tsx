import React from 'react';
import * as Icons from 'lucide-react';
import { ImprovementCategory } from '../../types/improvement';
import { improvementCategoryMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface ImprovementCategoryChipProps {
  category: ImprovementCategory;
  className?: string;
}

export function ImprovementCategoryChip({ category, className }: ImprovementCategoryChipProps) {
  const meta = improvementCategoryMeta[category];
  const IconComponent = (Icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[meta.icon];
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border', className)}
      style={{ color: meta.color, borderColor: `${meta.color}33`, backgroundColor: `${meta.color}11` }}
    >
      {IconComponent && <IconComponent size={11} />}
      {meta.label}
    </span>
  );
}
