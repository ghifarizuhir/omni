import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { slaStatusMeta_avail } from '../../lib/constants';
import { AvailabilitySLAStatus } from '../../types';

const iconMap = {
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
};

interface SLAStatusPillProps {
  status: AvailabilitySLAStatus;
  size?: 'sm' | 'md';
}

export function SLAStatusPill({ status, size = 'md' }: SLAStatusPillProps) {
  const meta = slaStatusMeta_avail[status];
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
