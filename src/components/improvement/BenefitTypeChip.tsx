import React from 'react';
import * as Icons from 'lucide-react';
import { BenefitType } from '../../types/improvement';
import { benefitTypeMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface BenefitTypeChipProps {
  type: BenefitType;
  className?: string;
}

export function BenefitTypeChip({ type, className }: BenefitTypeChipProps) {
  const meta = benefitTypeMeta[type];
  const IconComponent = (Icons as Record<string, React.ComponentType<{ size?: number }>>)[meta.icon];
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
    >
      {IconComponent && <IconComponent size={10} />}
      {meta.label}
    </span>
  );
}
