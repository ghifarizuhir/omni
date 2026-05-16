import React from 'react';
import { cn } from '@/src/lib/utils';

interface IDCellProps {
  value: string;
  className?: string;
}

/**
 * Mono identifier column for list rows (INC-1042, CHG-882, etc.).
 * Geist Mono via `font-mono`, tabular numerics, muted text color.
 */
export const IDCell: React.FC<IDCellProps> = ({ value, className }) => (
  <span
    className={cn(
      'font-mono text-[12px] tabular-nums text-ois-text-muted whitespace-nowrap',
      className,
    )}
  >
    {value}
  </span>
);
