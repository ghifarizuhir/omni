import React from 'react';
import { Users, Wrench, AlertTriangle, Zap } from 'lucide-react';
import { drTestTypeMeta } from '@/src/lib/constants';
import { DRTestType } from '@/src/types/continuity';

interface Props {
  type: DRTestType;
  className?: string;
}

const iconMap = {
  Users,
  Wrench,
  AlertTriangle,
  Zap,
} as const;

export const DRTestTypeChip: React.FC<Props> = ({ type, className }) => {
  const meta = drTestTypeMeta[type];
  const Icon = iconMap[meta.icon as keyof typeof iconMap];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 ${className ?? ''}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {meta.label}
    </span>
  );
};
