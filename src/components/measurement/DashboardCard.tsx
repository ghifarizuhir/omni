import React from 'react';
import { Briefcase, Settings, Target, Database, LayoutDashboard, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Card, CardBody } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { MeasurementDashboard, DashboardType } from '@/src/types/measurement';

interface DashboardCardProps {
  dashboard: MeasurementDashboard;
  onOpen: () => void;
}

const typeIcons: Record<DashboardType, React.ReactNode> = {
  executive:   <Briefcase size={20} />,
  operational: <Settings size={20} />,
  sla:         <Target size={20} />,
  capacity:    <Database size={20} />,
  custom:      <LayoutDashboard size={20} />,
};

const audienceLabels: Record<MeasurementDashboard['audience'], string> = {
  executives:     'Executives',
  operations:     'Operations',
  service_owners: 'Service Owners',
  all:            'All',
};

function relativeTime(isoStr?: string): string {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ dashboard, onOpen }) => {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onOpen}
    >
      <CardBody className="flex flex-col gap-3">
        {/* Icon + name */}
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
            'bg-ois-primary-pale text-ois-primary',
          )}>
            {typeIcons[dashboard.type]}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ois-text leading-tight group-hover:text-ois-primary transition-colors">
              {dashboard.name}
            </h3>
            <p className="mt-0.5 text-xs text-ois-text-subtle line-clamp-2">{dashboard.description}</p>
          </div>
        </div>

        {/* Audience chip */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-ois-surface-muted border border-ois-border px-2 py-0.5 text-[11px] font-medium text-ois-text-muted">
            {audienceLabels[dashboard.audience]}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-ois-text-subtle border-t border-ois-border pt-3 mt-auto">
          <span>Last viewed: <span className="text-ois-text font-medium">{relativeTime(dashboard.lastViewedAt)}</span></span>
          <span>{dashboard.viewCount30d} views (30d)</span>
        </div>

        {/* CTA */}
        <Button
          variant="secondary"
          size="sm"
          className="self-end"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        >
          Open
          <ArrowRight size={13} className="ml-1" />
        </Button>
      </CardBody>
    </Card>
  );
};
