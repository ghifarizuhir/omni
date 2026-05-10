import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChangeWindowDisplayProps {
  window: string;
  className?: string;
  freezeWindow?: boolean;
}

export const ChangeWindowDisplay: React.FC<ChangeWindowDisplayProps> = ({
  window,
  className,
  freezeWindow,
}) => (
  <span className={cn('inline-flex items-center gap-1 text-xs text-ois-text-muted', className)}>
    <Clock size={11} className={freezeWindow ? 'text-ois-warning' : 'text-ois-text-subtle'} />
    {window}
    {freezeWindow && (
      <span className="text-[10px] font-semibold text-ois-warning ml-1">⚠ Freeze</span>
    )}
  </span>
);
