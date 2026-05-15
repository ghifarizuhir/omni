import React, { useMemo, useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  measurementService, incidentsService, changesService, servicesService,
  useResource,
} from '@/src/services';
import { KPICardLarge } from '@/src/components/measurement/KPICardLarge';
import { AvailabilityTrendChart } from '@/src/components/measurement/AvailabilityTrendChart';
import { IncidentVolumeChart } from '@/src/components/measurement/IncidentVolumeChart';
import { ChangeOutcomesChart } from '@/src/components/measurement/ChangeOutcomesChart';
import { SLAComplianceTable } from '@/src/components/measurement/SLAComplianceTable';
import { SummaryStatBlock } from '@/src/components/measurement/SummaryStatBlock';
import { Button } from '@/src/components/ui/Button';

function formatMinutes(m: number): string {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h ${r}m` : `${r}m`;
}

type TimeRange = '7d' | '30d' | '90d';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  '7d':  7,
  '30d': 30,
  '90d': 90,
};

export const ExecutiveDashboard: React.FC = () => {
  const { data: summary } = useResource(() => measurementService.execSummary(), []);
  const { data: incidentsData } = useResource(() => incidentsService.list(), []);
  const { data: changesData }   = useResource(() => changesService.list(), []);
  const { data: servicesData }  = useResource(() => servicesService.list(), []);

  const [timeRange, setTimeRange]               = useState<TimeRange>('30d');
  const [timeRangeOpen, setTimeRangeOpen]       = useState(false);
  const [serviceFilter, setServiceFilter]       = useState<string>('All');
  const [serviceFilterOpen, setServiceFilterOpen] = useState(false);

  const incidents = incidentsData ?? [];
  const changes   = changesData ?? [];
  const services  = servicesData ?? [];

  const now = useMemo(() => Date.now(), []);
  const windowMs = TIME_RANGE_DAYS[timeRange] * 86_400_000;
  const windowStart = now - windowMs;
  const prevStart   = windowStart - windowMs;

  // Filter incidents/changes by service when a specific service is picked.
  const inService = useMemo(() => {
    if (serviceFilter === 'All') return (_id: string) => true;
    const svc = services.find(s => s.name === serviceFilter);
    if (!svc) return (_id: string) => true;
    return (id: string) => id === svc.id;
  }, [serviceFilter, services]);

  const scopedIncidents = useMemo(
    () => incidents.filter(i => (i.affectedServiceIds ?? []).some(inService) || serviceFilter === 'All'),
    [incidents, inService, serviceFilter],
  );

  // ── KPI: real values (with prior-period deltas) ───────────────────────────
  const mttrCurr = useMemo(() => {
    const ds: number[] = [];
    for (const i of scopedIncidents) {
      const r = i.resolution?.resolvedAt;
      if (!r) continue;
      const rt = new Date(r).getTime();
      if (rt >= windowStart && rt <= now) ds.push((rt - new Date(i.createdAt).getTime()) / 60_000);
    }
    return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : null;
  }, [scopedIncidents, windowStart, now]);

  const mttrPrev = useMemo(() => {
    const ds: number[] = [];
    for (const i of scopedIncidents) {
      const r = i.resolution?.resolvedAt;
      if (!r) continue;
      const rt = new Date(r).getTime();
      if (rt >= prevStart && rt < windowStart) ds.push((rt - new Date(i.createdAt).getTime()) / 60_000);
    }
    return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : null;
  }, [scopedIncidents, prevStart, windowStart]);

  const slaPctCurr = useMemo(() => {
    const resolved = scopedIncidents.filter(i => {
      const r = i.resolution?.resolvedAt;
      if (!r) return false;
      const rt = new Date(r).getTime();
      return rt >= windowStart && rt <= now;
    });
    if (resolved.length === 0) return null;
    const ok = resolved.filter(i => i.slaResolveStatus !== 'breached' && i.slaResponseStatus !== 'breached').length;
    return Math.round((ok / resolved.length) * 1000) / 10;
  }, [scopedIncidents, windowStart, now]);

  const slaPctPrev = useMemo(() => {
    const resolved = scopedIncidents.filter(i => {
      const r = i.resolution?.resolvedAt;
      if (!r) return false;
      const rt = new Date(r).getTime();
      return rt >= prevStart && rt < windowStart;
    });
    if (resolved.length === 0) return null;
    const ok = resolved.filter(i => i.slaResolveStatus !== 'breached' && i.slaResponseStatus !== 'breached').length;
    return Math.round((ok / resolved.length) * 1000) / 10;
  }, [scopedIncidents, prevStart, windowStart]);

  const changeSuccessCurr = useMemo(() => {
    const finished = changes.filter(c => {
      const t = new Date(c.plannedStart).getTime();
      return t >= windowStart && t <= now &&
        ['closed_successful', 'closed_failed'].includes(c.status);
    });
    if (finished.length === 0) return null;
    const ok = finished.filter(c => c.status === 'closed_successful').length;
    return Math.round((ok / finished.length) * 100);
  }, [changes, windowStart, now]);

  const changeSuccessPrev = useMemo(() => {
    const finished = changes.filter(c => {
      const t = new Date(c.plannedStart).getTime();
      return t >= prevStart && t < windowStart &&
        ['closed_successful', 'closed_failed'].includes(c.status);
    });
    if (finished.length === 0) return null;
    const ok = finished.filter(c => c.status === 'closed_successful').length;
    return Math.round((ok / finished.length) * 100);
  }, [changes, prevStart, windowStart]);

  // Active incidents and P1/P2 breakdown — live from data.
  const activeIncidents = useMemo(
    () => scopedIncidents.filter(i => !['resolved', 'closed'].includes(i.status)),
    [scopedIncidents],
  );
  const activeP1 = activeIncidents.filter(i => i.severity === 'P1').length;
  const activeP2 = activeIncidents.filter(i => i.severity === 'P2').length;

  const trendLabel = (curr: number | null, prev: number | null, unit: string, lowerIsBetter: boolean) => {
    if (curr == null || prev == null) return '—';
    const delta = curr - prev;
    if (delta === 0) return `±0${unit} vs prev`;
    const sign = delta > 0 ? '+' : '';
    const _better = lowerIsBetter ? delta < 0 : delta > 0;
    return `${sign}${delta}${unit} vs prev`;
  };

  const trendDir = (curr: number | null, prev: number | null, lowerIsBetter: boolean): 'up' | 'down' | undefined => {
    if (curr == null || prev == null) return undefined;
    const delta = curr - prev;
    if (delta === 0) return undefined;
    return lowerIsBetter ? (delta < 0 ? 'up' : 'down') : (delta > 0 ? 'up' : 'down');
  };

  // ── Chart data ──────────────────────────────────────────────────────────────
  const incidentVolumeData = useMemo(() => {
    // Bucket into weeks (always 4 weeks across the window, scaled to range).
    const totalWeeks = Math.max(1, Math.round(TIME_RANGE_DAYS[timeRange] / 7));
    const weeks: { week: string; P1: number; P2: number; P3: number; P4: number }[] = [];
    for (let w = totalWeeks - 1; w >= 0; w--) {
      const wEnd = now - w * 7 * 86_400_000;
      const wStart = wEnd - 7 * 86_400_000;
      const bucket = { week: `Wk ${totalWeeks - w}`, P1: 0, P2: 0, P3: 0, P4: 0 };
      for (const i of scopedIncidents) {
        const t = new Date(i.createdAt).getTime();
        if (t >= wStart && t < wEnd) {
          if (i.severity === 'P1' || i.severity === 'P2' || i.severity === 'P3' || i.severity === 'P4') {
            bucket[i.severity] += 1;
          }
        }
      }
      weeks.push(bucket);
    }
    return weeks;
  }, [scopedIncidents, timeRange, now]);

  const changeOutcomesData = useMemo(() => {
    const inWindow = changes.filter(c => {
      const t = new Date(c.plannedStart).getTime();
      return t >= windowStart && t <= now;
    });
    const successful  = inWindow.filter(c => c.status === 'closed_successful').length;
    const failed      = inWindow.filter(c => c.status === 'closed_failed').length;
    const cancelled   = inWindow.filter(c => ['cancelled', 'rejected'].includes(c.status)).length;
    const inProgress  = inWindow.filter(c => ['scheduled', 'implementing', 'approved', 'in_review', 'submitted', 'draft'].includes(c.status)).length;
    return [
      { name: 'Successful',  value: successful, color: '#12B76A' },
      { name: 'Failed',      value: failed,     color: '#F04438' },
      { name: 'Cancelled',   value: cancelled,  color: '#98A2B3' },
      { name: 'In Progress', value: inProgress, color: '#1F4FD4' },
    ];
  }, [changes, windowStart, now]);

  const slaTableRows = useMemo(
    () => services.map(s => ({
      service: s.name,
      current: typeof s.uptime30d === 'number' ? s.uptime30d : null,
      target:  typeof s.slaTarget  === 'number' ? s.slaTarget  : null,
    })),
    [services],
  );

  // SummaryStatBlock — compute four real groups.
  const summaryStats = useMemo(() => {
    const resolved = scopedIncidents.filter(i => {
      const r = i.resolution?.resolvedAt;
      if (!r) return false;
      const rt = new Date(r).getTime();
      return rt >= windowStart && rt <= now;
    });
    const totalDowntimeMin = resolved.reduce((sum, i) => {
      const r = i.resolution?.resolvedAt;
      if (!r) return sum;
      return sum + (new Date(r).getTime() - new Date(i.createdAt).getTime()) / 60_000;
    }, 0);
    const implementedChanges = changes.filter(c => {
      const t = new Date(c.plannedStart).getTime();
      return t >= windowStart && t <= now &&
        ['closed_successful', 'closed_failed'].includes(c.status);
    });
    const successful = implementedChanges.filter(c => c.status === 'closed_successful').length;
    const failed     = implementedChanges.filter(c => c.status === 'closed_failed').length;
    const slaBreaches = scopedIncidents.filter(i =>
      i.slaResolveStatus === 'breached' || i.slaResponseStatus === 'breached',
    ).length;

    return [
      [
        { label: 'incidents resolved', value: String(resolved.length) },
        { label: 'avg MTTR',           value: mttrCurr == null ? '—' : formatMinutes(mttrCurr) },
        { label: 'total downtime',     value: formatMinutes(Math.round(totalDowntimeMin)) },
      ],
      [
        { label: 'changes implemented', value: String(implementedChanges.length) },
        { label: 'success rate',        value: implementedChanges.length === 0 ? '—' : `${Math.round((successful / implementedChanges.length) * 100)}%` },
        { label: 'failed',              value: String(failed) },
      ],
      [
        { label: 'open incidents',  value: String(activeIncidents.length) },
        { label: 'P1 active',       value: String(activeP1) },
        { label: 'SLA breaches',    value: String(slaBreaches) },
      ],
    ];
  }, [scopedIncidents, changes, windowStart, now, mttrCurr, activeIncidents, activeP1]);

  const serviceOptions = useMemo(
    () => ['All', ...services.map(s => s.name)],
    [services],
  );

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          background:
            'radial-gradient(50% 60% at 20% 40%, rgba(31,79,212,0.08), transparent 70%), radial-gradient(40% 50% at 80% 30%, rgba(11,165,236,0.07), transparent 70%)',
        }}
      />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-px w-6 bg-ois-primary" />
            <span className="font-mono text-[10.5px] tracking-[0.18em] text-ois-text-muted">
              / EXECUTIVE DASHBOARD / {timeRange.toUpperCase()} /
            </span>
          </div>
          <h1 className="text-3xl font-bold text-ois-text tracking-[-0.02em]">Executive Dashboard</h1>
          <p className="text-sm text-ois-text-muted mt-1">Service reliability, change outcomes, and SLA performance at a glance.</p>
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

          {/* Service Filter — live from /services */}
          <div className="relative">
            <button
              onClick={() => { setServiceFilterOpen((o) => !o); setTimeRangeOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ois-border bg-white px-3 py-2 text-sm font-medium text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              Service: {serviceFilter}
              <ChevronDown size={14} />
            </button>
            {serviceFilterOpen && (
              <div className="absolute right-0 top-10 z-20 w-56 max-h-72 overflow-y-auto rounded-lg border border-ois-border bg-white shadow-lg py-1">
                {serviceOptions.map((svc) => (
                  <button
                    key={svc}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-ois-surface-muted transition-colors',
                      serviceFilter === svc ? 'text-ois-primary font-semibold' : 'text-ois-text',
                    )}
                    onClick={() => { setServiceFilter(svc); setServiceFilterOpen(false); }}
                  >
                    {svc}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" disabled title="Export coming soon.">
            <Download size={14} className="mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICardLarge
          title="SLA Compliance"
          value={slaPctCurr == null ? '—' : `${slaPctCurr}%`}
          trend={trendDir(slaPctCurr, slaPctPrev, false)}
          trendLabel={trendLabel(slaPctCurr, slaPctPrev, 'pp', false)}
          target="100%"
          status={slaPctCurr == null ? undefined : slaPctCurr >= 99 ? 'good' : slaPctCurr >= 95 ? 'warning' : 'bad'}
        />
        <KPICardLarge
          title="MTTR"
          value={mttrCurr == null ? '—' : formatMinutes(mttrCurr)}
          trend={trendDir(mttrCurr, mttrPrev, true)}
          trendLabel={trendLabel(mttrCurr, mttrPrev, 'm', true)}
          target="30 min"
          status={mttrCurr == null ? undefined : mttrCurr <= 30 ? 'good' : mttrCurr <= 60 ? 'warning' : 'bad'}
        />
        <KPICardLarge
          title="Change Success"
          value={changeSuccessCurr == null ? '—' : `${changeSuccessCurr}%`}
          trend={trendDir(changeSuccessCurr, changeSuccessPrev, false)}
          trendLabel={trendLabel(changeSuccessCurr, changeSuccessPrev, 'pp', false)}
          target="95%"
          status={changeSuccessCurr == null ? undefined : changeSuccessCurr >= 95 ? 'good' : changeSuccessCurr >= 80 ? 'warning' : 'bad'}
        />
        <KPICardLarge
          title="Active Incidents"
          value={String(activeIncidents.length)}
          subtext={`${activeP1} P1 · ${activeP2} P2`}
          status={activeP1 > 0 ? 'bad' : activeP2 > 0 ? 'warning' : 'good'}
        />
      </div>

      {/* Row 1: Availability Trend + Incident Volume */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ois-text-muted">Availability Trend ({services.length} services)</h2>
          <AvailabilityTrendChart timeRange={timeRange} services={services} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ois-text-muted">Incident Volume by Priority</h2>
          <IncidentVolumeChart data={incidentVolumeData} />
        </div>
      </div>

      {/* Row 2: Change Outcomes + SLA Compliance Table */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ois-text-muted">Change Outcomes ({TIME_RANGE_LABELS[timeRange].toLowerCase()})</h2>
          <ChangeOutcomesChart data={changeOutcomesData} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ois-text-muted">SLA Compliance by Service</h2>
          <SLAComplianceTable rows={slaTableRows} />
        </div>
      </div>

      {/* Summary Stat Block */}
      <SummaryStatBlock rows={summaryStats} />

      {/* Footer note when backend exec-summary defaults to 0 but we still */}
      {/* surface real values above. Keep summary reference for clarity.    */}
      {summary && (
        <p className="text-[11px] text-ois-text-subtle">
          Reference (backend exec-summary): SLA {summary.slaCompliancePct}% · MTTR {summary.mttrMinutes}m · Change success {summary.changeSuccessPct}% · Major incidents open {summary.openMajorIncidents}
        </p>
      )}
    </div>
  );
};
