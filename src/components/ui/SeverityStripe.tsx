import React from 'react';
import { cn } from '@/src/lib/utils';

export type StripeSeverity = 'P1' | 'P2' | 'P3' | 'P4';

interface SeverityStripeRowProps extends React.HTMLAttributes<HTMLDivElement> {
  severity: StripeSeverity;
  children: React.ReactNode;
}

const COLOR: Record<StripeSeverity, string> = {
  P1: '#B42318',  // ois-sev-p1
  P2: '#DC6803',  // ois-sev-p2
  P3: '#DC6803',  // ois-sev-p3 (same hue as P2 per existing tokens)
  P4: '#027A48',  // ois-sev-p4
};

/**
 * Row wrapper that applies a 3px left-edge accent in severity hue.
 * Use as the outer element of a list row when severity should be visible
 * from peripheral vision (vertical scan speed matters in ops lists).
 */
export const SeverityStripeRow: React.FC<SeverityStripeRowProps> = ({
  severity,
  className,
  style,
  children,
  ...rest
}) => (
  <div
    className={cn('border-l-[3px]', className)}
    style={{ borderLeftColor: COLOR[severity], ...style }}
    {...rest}
  >
    {children}
  </div>
);
