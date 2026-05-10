import React from 'react';
import { CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { changeTypeMeta } from '../../lib/constants';
import { ChangeType } from '../../types/change';

const icons = { standard: CheckCircle, normal: FileText, emergency: AlertTriangle };

interface ChangeTypeChipProps {
  type: ChangeType;
  size?: 'sm' | 'md';
  showDesc?: boolean;
}

export const ChangeTypeChip: React.FC<ChangeTypeChipProps> = ({ type, size = 'md', showDesc }) => {
  const meta = changeTypeMeta[type];
  const Icon = icons[type];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-semibold',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
      )}
      style={{ color: meta.color, background: meta.bg }}
    >
      <Icon size={size === 'sm' ? 10 : 12} />
      {meta.label}
      {showDesc && <span className="text-[10px] opacity-70 ml-1">{meta.description}</span>}
    </span>
  );
};
