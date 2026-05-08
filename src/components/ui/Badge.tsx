import React from 'react';
import { cn } from '@/src/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'status' | 'severity' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'neutral', children, ...props }) => {
  const variants = {
    neutral: 'bg-ois-surface-muted text-ois-text-muted border-ois-border',
    success: 'bg-ois-success-pale text-ois-success border-ois-success/20',
    warning: 'bg-ois-warning-pale text-ois-warning border-[#F79009]/20',
    danger: 'bg-ois-danger-pale text-ois-danger border-ois-danger/20',
    info: 'bg-ois-info-pale text-ois-info border-ois-info/20',
    status: 'bg-ois-primary-pale text-ois-primary border-ois-primary/20',
    severity: 'bg-ois-text text-white border-transparent',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-ois-badge text-[11px] font-medium border leading-none',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
