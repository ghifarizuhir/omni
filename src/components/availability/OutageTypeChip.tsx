import { AlertOctagon, Calendar, AlertTriangle, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { outageTypeMeta } from '../../lib/constants';
import { OutageType } from '../../types';

const iconMap = {
  AlertOctagon,
  Calendar,
  AlertTriangle,
  Eye,
};

interface OutageTypeChipProps {
  type: OutageType;
  size?: 'sm' | 'md';
}

export function OutageTypeChip({ type, size = 'md' }: OutageTypeChipProps) {
  const meta = outageTypeMeta[type];
  const Icon = iconMap[meta.icon as keyof typeof iconMap];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      )}
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {Icon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {meta.label}
    </span>
  );
}
