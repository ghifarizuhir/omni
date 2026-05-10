import React from 'react';
import { InboxItemPriority } from '@/src/types/platform';
import { inboxPriorityMeta } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';

interface InboxPriorityBadgeProps {
  priority: InboxItemPriority;
  className?: string;
}

export const InboxPriorityBadge: React.FC<InboxPriorityBadgeProps> = ({ priority, className }) => {
  const meta = inboxPriorityMeta[priority];

  if (priority === 'normal' || priority === 'low') {
    // Empty/subtle badge for lower priorities
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border leading-none',
          className
        )}
        style={{ color: meta.color, background: 'transparent', borderColor: `${meta.color}40` }}
      >
        {meta.label}
      </span>
    );
  }

  // Filled pill for urgent/high
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold leading-none',
        className
      )}
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label.toUpperCase()}
    </span>
  );
};
