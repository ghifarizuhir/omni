import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Download, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { mockDailyServiceHealth } from '@/src/mocks/dailyServiceHealth';
import { mockServices } from '@/src/mocks/services';
import { mockSLATargets } from '@/src/mocks/slaTargets';
import { getActiveBreaches } from '@/src/mocks/slaBreaches';
import { mockOutages } from '@/src/mocks/outages';
import { KPICard } from '@/src/components/ui/KPICard';
import { Card, CardBody } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { UptimeCalendarHeatmap } from '@/src/components/availability/UptimeCalendarHeatmap';
import { MTTRTrendChart } from '@/src/components/availability/MTTRTrendChart';
import { SLAComplianceDonut } from '@/src/components/availability/SLAComplianceDonut';
import { ActiveBreachesList } from '@/src/components/availability/ActiveBreachesList';
import { OutageTimeline } from '@/src/components/availability/OutageTimeline';

export const AvailabilityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [compact, setCompact] = useState(false);

  const activeBreaches = useMemo(() => getActiveBreaches(), []);

  const recentOutages = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return [...mockOutages]
      .filter((o) => new Date(o.startedAt) >= cutoff)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, []);

  const serviceList = useMemo(
    () => mockServices.map((s) => ({ id: s.id, name: s.name })),
    [],
  );

  const slaStats = useMemo(() => {
    const meeting = mockSLATargets.filter((s) => s.status === 'meeting').length;
    const breached = mockSLATargets.filter((s) => s.status === 'breached').length;
    const atRisk = mockSLATargets.filter((s) => s.status === 'at_risk').length;
    return { meeting, breached, atRisk };
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm">
          <Download size={14} className="mr-1" />
          Export
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Avg Uptime (30d)"
          value="99.32%"
          trend={-0.18}
          trendLabel="vs prev 30d"
          trendBetter="high"
          subDetail="Target: 99.85%"
        />
        <KPICard
          label="MTTR (30d)"
          value="2h 14m"
          trend={-8}
          trendLabel="vs prev period"
          trendBetter="low"
          subDetail="Target: < 30 min"
        />
        <KPICard
          label="MTBF (30d)"
          value="18 days"
          trend={17}
          trendLabel="vs prev period"
          trendBetter="high"
          subDetail="Target: > 14 days"
        />
        <KPICard
          label="Active Outages"
          value="3"
          subDetail="2 unplanned · 1 partial"
        />
      </div>

      {/* Hero: 90-day Uptime Calendar Heatmap */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ois-border">
          <h2 className="text-sm font-semibold text-ois-text">Service Uptime — Last 90 Days</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompact((c) => !c)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                compact
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {compact ? 'Compact ✓' : 'Compact'}
            </button>
          </div>
        </div>
        <CardBody>
          <UptimeCalendarHeatmap
            data={mockDailyServiceHealth}
            services={serviceList}
            compact={compact}
            onCellClick={(serviceId, date) =>
              navigate(`/availability/outages?service=${serviceId}&date=${date}`)
            }
          />
        </CardBody>
      </Card>

      {/* Two-column section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left 60%: MTTR/MTBF/MTRS Trend */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <div className="px-5 py-4 border-b border-ois-border">
              <h2 className="text-sm font-semibold text-ois-text">MTTR / MTBF / MTRS Trend (30d)</h2>
            </div>
            <CardBody>
              <MTTRTrendChart />
            </CardBody>
          </Card>
        </div>

        {/* Right 40%: SLA Compliance */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="px-5 py-4 border-b border-ois-border">
              <h2 className="text-sm font-semibold text-ois-text">SLA Compliance</h2>
            </div>
            <CardBody className="space-y-4">
              <SLAComplianceDonut
                meeting={slaStats.meeting}
                atRisk={slaStats.atRisk}
                breached={slaStats.breached}
              />
              <ActiveBreachesList breaches={activeBreaches} slas={mockSLATargets} />
              <div className="pt-1">
                <Link
                  to="/availability/sla"
                  className="text-xs font-medium text-primary-600 hover:underline inline-flex items-center gap-1"
                >
                  View all SLAs
                  <ArrowRight size={12} />
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom: Recent Outages Timeline */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ois-border">
          <h2 className="text-sm font-semibold text-ois-text">Recent Outages — Last 30 Days</h2>
          <Link
            to="/availability/outages"
            className="text-xs font-medium text-primary-600 hover:underline inline-flex items-center gap-1"
          >
            View all outages
            <ArrowRight size={12} />
          </Link>
        </div>
        <CardBody>
          <OutageTimeline
            outages={recentOutages}
            onOutageClick={() => navigate('/availability/outages')}
          />
        </CardBody>
      </Card>
    </div>
  );
};
