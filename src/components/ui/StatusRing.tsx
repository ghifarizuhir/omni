import React from 'react';
import { cn } from '@/src/lib/utils';

export type RingState =
  | 'open'           // empty ring, muted
  | 'acknowledged'   // half-filled, OIS blue
  | 'investigating'  // three-quarter filled, OIS blue
  | 'resolved'       // filled green + check
  | 'closed';        // dashed empty ring, muted

interface StatusRingProps {
  state: RingState;
  className?: string;
  'aria-label'?: string;
}

/**
 * 14px glyph that encodes incident/event state. Replaces a status chip
 * in list rows where a single glyph is enough.
 */
export const StatusRing: React.FC<StatusRingProps> = ({ state, className, 'aria-label': ariaLabel }) => {
  const label = ariaLabel ?? `Status: ${state}`;
  switch (state) {
    case 'open':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#98A2B3" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'acknowledged':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#1F4FD4" strokeWidth="1.5" fill="none" />
          <path d="M7 1.5 a 5.5 5.5 0 0 1 0 11 Z" fill="#1F4FD4" />
        </svg>
      );
    case 'investigating':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#1F4FD4" strokeWidth="1.5" fill="none" />
          <path d="M7 1.5 a 5.5 5.5 0 0 1 5.5 5.5 a 5.5 5.5 0 0 1 -5.5 5.5 Z" fill="#1F4FD4" />
        </svg>
      );
    case 'resolved':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" fill="#12B76A" />
          <path d="M4.5 7 L6.5 9 L9.5 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'closed':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#98A2B3" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
        </svg>
      );
  }
};
