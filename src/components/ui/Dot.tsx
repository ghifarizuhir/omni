import React from 'react';
import { cn } from '@/src/lib/utils';

export type DotVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted';
export type DotSize = 'sm' | 'md' | 'lg';

interface DotProps {
  variant?: DotVariant;
  size?: DotSize;
  pulse?: boolean;
  className?: string;
  'aria-label'?: string;
}

const VARIANT_CLASS: Record<DotVariant, string> = {
  success: 'bg-ois-success',
  warning: 'bg-ois-warning',
  danger:  'bg-ois-danger',
  info:    'bg-ois-info',
  muted:   'bg-ois-text-subtle',
};

const SIZE_CLASS: Record<DotSize, string> = {
  sm: 'w-1.5 h-1.5',  // 6px
  md: 'w-2   h-2',    // 8px
  lg: 'w-2.5 h-2.5',  // 10px
};

export const Dot: React.FC<DotProps> = ({
  variant = 'muted',
  size = 'md',
  pulse = false,
  className,
  'aria-label': ariaLabel,
}) => {
  if (pulse) {
    return (
      <span className={cn('relative inline-flex shrink-0', SIZE_CLASS[size], className)} aria-label={ariaLabel}>
        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', VARIANT_CLASS[variant])} />
        <span className={cn('relative inline-flex rounded-full', SIZE_CLASS[size], VARIANT_CLASS[variant])} />
      </span>
    );
  }
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', SIZE_CLASS[size], VARIANT_CLASS[variant], className)}
      aria-label={ariaLabel}
    />
  );
};
