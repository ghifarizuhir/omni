import React from 'react';
import { Badge } from './Badge';
import { ServiceHealthStatus, Severity } from '@/src/types';

export const StatusBadge: React.FC<{ status: ServiceHealthStatus | string }> = ({ status }) => {
  const getVariant = (s: string) => {
    switch (s) {
      case 'operational': return 'success';
      case 'degraded': return 'warning';
      case 'partial_outage': return 'warning';
      case 'major_outage': return 'danger';
      case 'maintenance': return 'neutral';
      default: return 'neutral';
    }
  };

  return <Badge variant={getVariant(status)} className="capitalize">{status.replace('_', ' ')}</Badge>;
};

export const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const colors = {
    P1: 'bg-ois-sev-p1',
    P2: 'bg-ois-sev-p2',
    P3: 'bg-ois-sev-p3',
    P4: 'bg-ois-sev-p4',
  };

  return (
    <Badge variant="severity" className={colors[severity]}>
      {severity}
    </Badge>
  );
};
