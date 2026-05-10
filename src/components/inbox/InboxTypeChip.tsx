import React from 'react';
import * as Icons from 'lucide-react';
import { InboxItemType } from '@/src/types/platform';
import { inboxItemTypeMeta } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';

interface InboxTypeChipProps {
  type: InboxItemType;
  className?: string;
}

export const InboxTypeChip: React.FC<InboxTypeChipProps> = ({ type, className }) => {
  const meta = inboxItemTypeMeta[type];
  const IconComponent = (Icons as Record<string, React.ElementType>)[meta.icon];

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border leading-none', className)}
      style={{ color: meta.color, background: `${meta.color}18`, borderColor: `${meta.color}30` }}
    >
      {IconComponent && <IconComponent size={10} />}
      {meta.label}
    </span>
  );
};
