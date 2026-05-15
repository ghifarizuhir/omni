import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Download, ArrowRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { availabilityService, servicesService, incidentsService, useResource } from '@/src/services';
import { KPICard } from '@/src/components/ui/KPICard';
import { Card, CardBody } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { UptimeCalendarHeatmap } from '@/src/components/availability/UptimeCalendarHeatmap';
import { MTTRTrendChart } from '@/src/components/availability/MTTRTrendChart';
import { SLAComplianceDonut } from '@/src/components/availability/SLAComplianceDonut';
import { ActiveBreachesList } from '@/src/components/availability/ActiveBreachesList';
import { OutageTimeline } from '@/src/components/availability/OutageTimeline';
import { ConnectedSourcesPanel } from '@/src/components/platform/ConnectedSourcesPanel';

export const AvailabilityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [compact, setCompact] = useState(false);

  const { data: dailyHealthData } = useResource(() => availabilityService.dailyHealth(), []);
  const { data: servicesData } = useResource(() => servicesService.list(), []);
  const { data: slaData } = useResource(() => availabilityService.slaTargets(), []);
  const { data: activeBreachesData } = useResource(() => availabilityService.activeBreaches(), []);
  const { data: outagesData } = useResource(() => availabilityService.outages(), []);
  const { data: incidentsData } = useResource(() => incidentsService.list(), []);

  const dailyServiceHealth = dailyHealthData ?? [];
  const services = servicesData ?? [];
  const slaTargets = slaData ?? [];
  const activeBreaches = activeBreachesData ?? [];
  const outages = outagesData ?? [];
  const incidents = incidentsData ?? [];

  // ── Live KPI computations over the last 30 days ───────────────────────────
  const now = useMemo(() => Date.now(), []);
  const WINDOW_MS = 30 * 86_400_000;
  const windowStart = now - WINDOW_MS;

  const avgUptime30d = useMemo(() => {
    if (services.length === 0) return null;
    const vals = services.map(s => s.uptime30d).filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [services]);

  const mttrMinutes = useMemo(() => {
    const durations: number[] = [];
    for (const inc of incidents) {
      const r = inc.resolution?.resolvedAt;
      if (!r) continue;
      const rt = new Date(r).getTime();
      if (rt < windowStart || rt > now) continue;
      durations.push((rt - new Date(inc.createdAt).getTime()) / 60_000);
    }
    if (durations.length === 0) return null;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }, [incidents, now, windowStart]);

  const mtbfDays = useMemo(() => {
    // Mean time between failures: window length / number of failures in window.
    const failures = incidents.filter(i => {
      const t = new Date(i.createdAt).getTime();
      return t >= windowStart && t <= now;
    }).length;
    if (failures === 0) return null;
    return Math.round((WINDOW_MS / 86_400_000) / failures);
  }, [incidents, now, windowStart]);

  const activeOutagesCount = useMemo(
    () => outages.filter(o => !o.endedAt).length,
    [outages],
  );
  // Daily MTTR/MTRS/MTBF trend over the last 30 days, computed from incidents
  // bucketed by `resolution.resolvedAt`. Days with no resolutions contribute a
  // zero so the chart line is continuous.
  const mttrTrend = useMemo(() => {
    const days = 30;
    const out: { date: string; mttr: number; mtbf: number; mtrs: number }[] = [];
    const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(now - i * 86_400_000);
      const dayEnd   = dayStart + 86_400_000;
      const label    = new Date(dayStart).toLocaleDateString('default', { month: 'short', day: 'numeric' });
      const resolutionMinutes: number[] = [];
      let createdInDay = 0;
      for (const inc of incidents) {
        const ct = new Date(inc.createdAt).getTime();
        if (ct >= dayStart && ct < dayEnd) createdInDay += 1;
        const r = inc.resolution?.resolvedAt;
        if (!r) continue;
        const rt = new Date(r).getTime();
        if (rt >= dayStart && rt < dayEnd) {
          resolutionMinutes.push((rt - ct) / 60_000);
        }
      }
      const avg = resolutionMinutes.length === 0
        ? 0
        : resolutionMinutes.reduce((a, b) => a + b, 0) / resolutionMinutes.length;
      // MTBF in minutes: 1 day / failures-that-day (clamped). 0 if no failures.
      const mtbf = createdInDay === 0 ? 0 : Math.round((1440 / createdInDay));
      out.push({
        date: label,
        mttr: +avg.toFixed(1),
        mtrs: +avg.toFixed(1),
        mtbf,
      });
    }
    return out;
  }, [incidents, now]);

  const activeOutagesBreakdown = useMemo(() => {
    const open = outages.filter(o => !o.endedAt);
    if (open.length === 0) return 'None active';
    const unplanned = open.filter(o => o.type === 'unplanned').length;
    const partial   = open.filter(o => o.type === 'partial').length;
    return `${unplanned} unplanned · ${partial} partial`;
  }, [outages]);

  const recentOutages = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return [...outages]
      .filter((o) => new Date(o.startedAt) >= cutoff)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [outages]);

  const serviceList = useMemo(
    () => services.map((s) => ({ id: s.id, name: s.name })),
    [services],
  );

  const slaStats = useMemo(() => {
    const meeting = slaTargets.filter((s) => s.status === 'meeting').length;
    const breached = slaTargets.filter((s) => s.status === 'breached').length;
    const atRisk = slaTargets.filter((s) => s.status === 'at_risk').length;
    return { meeting, breached, atRisk };
  }, [slaTargets]);

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
          value={avgUptime30d == null ? '—' : `${avgUptime30d.toFixed(2)}%`}
          trendBetter="high"
          subDetail={`Across ${services.length} service${services.length === 1 ? '' : 's'}`}
        />
        <KPICard
          label="MTTR (30d)"
          value={mttrMinutes == null
            ? '—'
            : mttrMinutes >= 60
              ? `${Math.floor(mttrMinutes / 60)}h ${mttrMinutes % 60}m`
              : `${mttrMinutes}m`}
          trendBetter="low"
          subDetail={mttrMinutes == null ? 'No resolved incidents in window' : 'Target: < 30 min'}
        />
        <KPICard
          label="MTBF (30d)"
          value={mtbfDays == null ? '—' : `${mtbfDays} day${mtbfDays === 1 ? '' : 's'}`}
          trendBetter="high"
          subDetail={mtbfDays == null ? 'No incidents in window' : 'Target: > 14 days'}
        />
        <KPICard
          label="Active Outages"
          value={String(activeOutagesCount)}
          subDetail={activeOutagesBreakdown}
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
            data={dailyServiceHealth}
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
              <MTTRTrendChart data={mttrTrend} />
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
              <ActiveBreachesList breaches={activeBreaches} slas={slaTargets} />
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

      {/* Connected monitoring sources */}
      <ConnectedSourcesPanel domain="availability" />

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
