import React, { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { KPICardLarge } from '@/src/components/measurement/KPICardLarge';
import { AvailabilityTrendChart } from '@/src/components/measurement/AvailabilityTrendChart';
import { IncidentVolumeChart } from '@/src/components/measurement/IncidentVolumeChart';
import { ChangeOutcomesChart } from '@/src/components/measurement/ChangeOutcomesChart';
import { SLAComplianceTable } from '@/src/components/measurement/SLAComplianceTable';
import { SummaryStatBlock } from '@/src/components/measurement/SummaryStatBlock';
import { Button } from '@/src/components/ui/Button';

type TimeRange = '7d' | '30d' | '90d';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

export const ExecutiveDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);
  const [serviceFilterOpen, setServiceFilterOpen] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Executive Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Time Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setTimeRangeOpen((o) => !o); setServiceFilterOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ois-border bg-white px-3 py-2 text-sm font-medium text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              {TIME_RANGE_LABELS[timeRange]}
              <ChevronDown size={14} />
            </button>
            {timeRangeOpen && (
              <div className="absolute right-0 top-10 z-20 w-40 rounded-lg border border-ois-border bg-white shadow-lg py-1">
                {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((tr) => (
                  <button
                    key={tr}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-ois-surface-muted transition-colors',
                      timeRange === tr ? 'text-ois-primary font-semibold' : 'text-ois-text',
                    )}
                    onClick={() => { setTimeRange(tr); setTimeRangeOpen(false); }}
                  >
                    {TIME_RANGE_LABELS[tr]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service Filter (cosmetic) */}
          <div className="relative">
            <button
              onClick={() => { setServiceFilterOpen((o) => !o); setTimeRangeOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ois-border bg-white px-3 py-2 text-sm font-medium text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              Service: All
              <ChevronDown size={14} />
            </button>
            {serviceFilterOpen && (
              <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-ois-border bg-white shadow-lg py-1">
                {['All', 'Payment Service', 'Auth Service', 'Order Service'].map((svc) => (
                  <button
                    key={svc}
                    className="w-full text-left px-3 py-2 text-sm text-ois-text hover:bg-ois-surface-muted transition-colors"
                    onClick={() => setServiceFilterOpen(false)}
                  >
                    {svc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export (cosmetic) */}
          <Button variant="secondary" size="sm">
            <Download size={14} className="mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICardLarge
          title="SLA Compliance"
          value="75%"
          trend="down"
          trendLabel="-12pp vs Q1"
          target="100%"
          status="bad"
        />
        <KPICardLarge
          title="MTTR"
          value="2h 14m"
          trend="down"
          trendLabel="+14m vs prev"
          target="30 min"
          status="bad"
        />
        <KPICardLarge
          title="Change Success"
          value="87%"
          trend="up"
          trendLabel="+2% vs prev"
          target="95%"
          status="warning"
        />
        <KPICardLarge
          title="Active Incidents"
          value="9"
          subtext="1 P1 · 3 P2"
          status="warning"
        />
      </div>

      {/* Row 1: Availability Trend + Incident Volume */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-ois-text">Availability Trend (8 services)</h2>
          <AvailabilityTrendChart timeRange={timeRange} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-ois-text">Incident Volume by Priority</h2>
          <IncidentVolumeChart timeRange={timeRange} />
        </div>
      </div>

      {/* Row 2: Change Outcomes + SLA Compliance Table */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-ois-text">Change Outcomes (30d)</h2>
          <ChangeOutcomesChart timeRange={timeRange} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-ois-text">SLA Compliance by Service</h2>
          <SLAComplianceTable timeRange={timeRange} />
        </div>
      </div>

      {/* Summary Stat Block */}
      <SummaryStatBlock timeRange={timeRange} />
    </div>
  );
};
