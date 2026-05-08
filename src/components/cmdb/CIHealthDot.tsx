import React from 'react';
import { ServiceHealthStatus } from '../../types/common';
import { cn } from '../../lib/utils';

interface CIHealthDotProps {
  health: ServiceHealthStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showRipple?: boolean;
}

export const CIHealthDot: React.FC<CIHealthDotProps> = ({ 
  health, 
  size = 'md', 
  className,
  showRipple = false 
}) => {
  const statusColors = {
    operational: 'bg-ois-success',
    degraded: 'bg-ois-warning',
    partial_outage: 'bg-ois-warning',
    major_outage: 'bg-ois-danger',
    maintenance: 'bg-ois-info',
  };

  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const rippleColors = {
    operational: 'bg-ois-success/40',
    degraded: 'bg-ois-warning/40',
    partial_outage: 'bg-ois-warning/40',
    major_outage: 'bg-ois-danger/40',
    maintenance: 'bg-ois-info/40',
  };

  return (
    <div className={cn("relative flex shrink-0", sizeClasses[size], className)}>
      {showRipple && health !== 'operational' && (
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          rippleColors[health]
        )} />
      )}
      <span className={cn(
        "relative inline-flex rounded-full",
        sizeClasses[size],
        statusColors[health] || 'bg-ois-text-subtle'
      )} />
    </div>
  );
};
