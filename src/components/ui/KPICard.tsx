import React from 'react';
import { Card, CardBody } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  className?: string;
  icon?: React.ReactNode;
  trendBetter?: 'high' | 'low' | 'neutral';
  subDetail?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  label, 
  value, 
  trend, 
  trendLabel, 
  className, 
  icon, 
  trendBetter = 'high',
  subDetail
}) => {
  const getTrendColor = () => {
    if (!trend || trendBetter === 'neutral') return "text-ois-text-subtle bg-ois-surface-muted";
    
    const isPositive = trend > 0;
    const isGood = trendBetter === 'high' ? isPositive : !isPositive;
    
    return isGood ? "text-ois-success bg-ois-success-pale" : "text-ois-danger bg-ois-danger-pale";
  };

  return (
    <Card className={cn('h-full hover:shadow-md transition-shadow', className)}>
      <CardBody className="flex flex-col gap-1 p-6">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">{label}</span>
          <div className="text-ois-text-subtle">{icon}</div>
        </div>
        <div className="text-4xl font-bold text-ois-text leading-tight">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded",
              getTrendColor()
            )}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend >= 0 ? '+' : ''}{trend}{trendLabel?.includes('%') ? '' : '%'}
            </div>
            {trendLabel && <span className="text-xs text-ois-text-subtle">{trendLabel}</span>}
          </div>
        )}
        {subDetail && <div className="text-[11px] text-ois-text-subtle font-medium mt-1 uppercase">{subDetail}</div>}
      </CardBody>
    </Card>
  );
};
