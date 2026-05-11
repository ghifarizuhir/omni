import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, Download, ChevronDown, ArrowLeft,
  AlertCircle, Clock, ShieldCheck, Siren,
  ExternalLink, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { KPICard } from '@/src/components/ui/KPICard';
import { Button } from '@/src/components/ui/Button';
import { VolumeOverTimeChart } from '@/src/components/incidents/analytics/VolumeOverTimeChart';
import { MTTRByServiceChart } from '@/src/components/incidents/analytics/MTTRByServiceChart';
import { TopCategoriesPanel } from '@/src/components/incidents/analytics/TopCategoriesPanel';
import { SLAPerformancePanel } from '@/src/components/incidents/analytics/SLAPerformancePanel';
import { mockIncidents } from '@/src/mocks/incidents';
import { mockServices } from '@/src/mocks/services';
import { mockUsers } from '@/src/mocks/users';
import { formatRelative, formatDate } from '@/src/lib/format';
import { subDays, parseISO, isAfter } from 'date-fns';

type DateRange = '7d' | '30d' | '90d';

const RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

const SERVICE_MAP = Object.fromEntries(mockServices.map(s => [s.id, s.name]));

type CISortField = 'publicId' | 'count' | 'lastIncident';

export const IncidentAnalytics: React.FC = () => {
  const [range, setRange] = useState<DateRange>('30d');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [ciSort, setCISort] = useState<{ field: CISortField; dir: 'asc' | 'desc' }>({ field: 'count', dir: 'desc' });

  const referenceDate = new Date('2026-05-08');
  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;

  const filteredIncidents = useMemo(() => {
    const cutoff = subDays(referenceDate, rangeDays);
    return mockIncidents.filter(inc => isAfter(parseISO(inc.createdAt), cutoff));
  }, [rangeDays]);

  // KPI 1: Total
  const total = filteredIncidents.length;

  // KPI 2: MTTR (minutes)
  const resolved = filteredIncidents.filter(i => i.resolution?.resolvedAt);
  const mttrMinutes = resolved.length > 0
    ? resolved.reduce((sum, inc) => {
        const elapsed = (new Date(inc.resolution!.resolvedAt).getTime() - new Date(inc.createdAt).getTime()) / 60_000;
        return sum + elapsed;
      }, 0) / resolved.length
    : 0;
  const mttrHours = Math.floor(mttrMinutes / 60);
  const mttrMins = Math.round(mttrMinutes % 60);
  const mttrLabel = mttrHours > 0 ? `${mttrHours}h ${mttrMins}m` : `${Math.round(mttrMinutes)}m`;

  // KPI 3: SLA compliance (resolve SLA)
  const slaCompliant = filteredIncidents.filter(i =>
    i.slaResolveStatus === 'met' || i.slaResolveStatus === 'healthy'
  ).length;
  const slaCompliancePct = total > 0 ? ((slaCompliant / total) * 100).toFixed(1) : '0';

  // KPI 4: Major incidents
  const majorCount = filteredIncidents.filter(i => i.isMajor).length;

  // Recurring CIs
  type CIEntry = { count: number; lastIncident: string; lastIncidentTime: string; publicId: string };
  const ciCount: Record<string, CIEntry> = {};
  for (const inc of filteredIncidents) {
    for (let idx = 0; idx < inc.affectedCIIds.length; idx++) {
      const ciId = inc.affectedCIIds[idx];
      const ciPub = inc.affectedCIPublicIds[idx] ?? ciId;
      if (!ciCount[ciId]) {
        ciCount[ciId] = { count: 0, lastIncident: '', lastIncidentTime: '', publicId: ciPub };
      }
      ciCount[ciId].count++;
      if (!ciCount[ciId].lastIncidentTime || inc.createdAt > ciCount[ciId].lastIncidentTime) {
        ciCount[ciId].lastIncident = inc.publicId;
        ciCount[ciId].lastIncidentTime = inc.createdAt;
        ciCount[ciId].publicId = ciPub;
      }
    }
  }

  const topCIs = Object.entries(ciCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([ciId, data]) => ({ ciId, ...data }));

  const activeProblemsLinkedCIs = filteredIncidents
    .filter(i => i.linkedProblemPublicId)
    .flatMap(i => i.affectedCIIds);
  const linkedProblemCISet = new Set(activeProblemsLinkedCIs);
  const linkedProblemCount = topCIs.filter(ci => linkedProblemCISet.has(ci.ciId)).length;

  const sortedCIs = useMemo(() => {
    return [...topCIs].sort((a, b) => {
      const dir = ciSort.dir === 'asc' ? 1 : -1;
      if (ciSort.field === 'publicId') return dir * (a.publicId ?? '').localeCompare(b.publicId ?? '');
      if (ciSort.field === 'lastIncident') {
        return dir * (
          new Date(a.lastIncidentTime || 0).getTime() -
          new Date(b.lastIncidentTime || 0).getTime()
        );
      }
      return dir * (a.count - b.count);
    });
  }, [topCIs, ciSort]);

  const toggleCISort = (field: CISortField) => {
    setCISort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { field, dir: 'desc' }
    );
  };

  const SortIcon: React.FC<{ field: CISortField }> = ({ field }) => {
    if (ciSort.field !== field) return <ArrowUpDown size={12} className="text-ois-text-subtle ml-1 shrink-0" />;
    return ciSort.dir === 'asc'
      ? <ArrowUp size={12} className="text-ois-primary ml-1 shrink-0" />
      : <ArrowDown size={12} className="text-ois-primary ml-1 shrink-0" />;
  };

  const handleExport = () => {
    const headers = [
      'ID', 'Title', 'Priority', 'Status', 'Assignee',
      'Service', 'Created', 'MTTR (min)', 'SLA Response', 'SLA Resolve', 'Tags',
    ];
    const rows = filteredIncidents.map(inc => {
      const assigneeName = mockUsers.find(u => u.id === inc.assigneeId)?.name ?? '';
      const serviceName = inc.affectedServiceIds.map(id => SERVICE_MAP[id]).filter(Boolean).join('; ');
      const mttr = inc.resolution?.resolvedAt
        ? Math.round((new Date(inc.resolution.resolvedAt).getTime() - new Date(inc.createdAt).getTime()) / 60_000)
        : '';
      return [
        inc.publicId,
        `"${inc.title.replace(/"/g, '""')}"`,
        inc.priority,
        inc.status,
        `"${assigneeName}"`,
        `"${serviceName}"`,
        formatDate(inc.createdAt),
        mttr,
        inc.slaResponseStatus,
        inc.slaResolveStatus,
        `"${inc.tags.join(', ')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="-mx-6 -mt-6 flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Nav row — shrink-0 keeps it pinned; no sticky needed in flex-column layout ── */}
      <div className="bg-white border-b border-ois-border shrink-0">
        <div className="flex items-center justify-between px-6 py-2">
          <Link
            to="/incidents"
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} />
            Incidents
          </Link>

          <div className="flex items-center gap-2">
            {/* Date range picker */}
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setRangeOpen(!rangeOpen)} className="gap-2">
                {RANGE_LABELS[range]}
                <ChevronDown size={14} />
              </Button>
              {rangeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[160px]">
                    {(Object.entries(RANGE_LABELS) as [DateRange, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setRange(key); setRangeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors ${range === key ? 'font-semibold text-ois-primary' : 'text-ois-text'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleExport}>
              <Download size={14} />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* ── Scrollable content — only this region scrolls ────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-10">

        {/* Title section — accent stripe + module label + h1 */}
        <div className="flex items-start gap-3">
          <div
            className="w-1 self-stretch rounded-full shrink-0 mt-1"
            style={{ background: 'linear-gradient(to bottom, #F04438, #F79009)' }}
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-1">
              Incidents · Analytics
            </p>
            <h1 className="text-2xl font-bold text-ois-text">Incident Analytics</h1>
            <p className="text-sm text-ois-text-muted mt-0.5">
              {filteredIncidents.length} incidents · {RANGE_LABELS[range]}
            </p>
          </div>
        </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="Total incidents"
          value={total}
          trend={-3}
          trendLabel="vs prev 30d"
          trendBetter="low"
          icon={<div className="p-2 rounded-lg bg-ois-danger-pale"><AlertCircle size={18} className="text-ois-danger" /></div>}
        />
        <KPICard
          label="MTTR"
          value={mttrLabel}
          trend={-14}
          trendLabel="min vs prev 30d"
          trendBetter="low"
          icon={<div className="p-2 rounded-lg bg-ois-warning-pale"><Clock size={18} className="text-ois-warning" /></div>}
        />
        <KPICard
          label="SLA compliance"
          value={`${slaCompliancePct}%`}
          trend={1.2}
          trendLabel="vs prev 30d"
          trendBetter="high"
          icon={<div className="p-2 rounded-lg bg-ois-success-pale"><ShieldCheck size={18} className="text-ois-success" /></div>}
        />
        <KPICard
          label="Major incidents"
          value={majorCount}
          trend={0}
          trendLabel="same as prev 30d"
          trendBetter="low"
          icon={<div className="p-2 rounded-lg bg-ois-danger-pale"><Siren size={18} className="text-ois-danger" /></div>}
        />
      </div>

      {/* Volume over time */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-ois-text-muted" />
              <h2 className="text-sm font-bold text-ois-text">
                Incident volume — {RANGE_LABELS[range]}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-ois-text-subtle">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ois-danger" />
                {filteredIncidents.filter(i => i.priority === 'P1').length} critical
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ois-warning" />
                {filteredIncidents.filter(i => i.priority === 'P2').length} high
              </span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          <VolumeOverTimeChart incidents={filteredIncidents} rangeDays={rangeDays} referenceDate={referenceDate} />
        </CardBody>
      </Card>

      {/* MTTR + Top categories */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-ois-text">MTTR by service</h2>
            <p className="text-xs text-ois-text-muted mt-0.5">Mean time to resolve, resolved incidents only</p>
          </CardHeader>
          <CardBody>
            <MTTRByServiceChart incidents={filteredIncidents} serviceMap={SERVICE_MAP} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-ois-text">Top categories</h2>
            <p className="text-xs text-ois-text-muted mt-0.5">By incident tag frequency</p>
          </CardHeader>
          <CardBody>
            <TopCategoriesPanel incidents={filteredIncidents} />
          </CardBody>
        </Card>
      </div>

      {/* Recurring offenders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ois-text">Top recurring CIs</h2>
              <p className="text-xs text-ois-text-muted mt-0.5">Configuration items with most incident appearances</p>
            </div>
            {linkedProblemCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-ois-warning bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <AlertCircle size={13} className="text-amber-600" />
                <span className="text-amber-800">
                  {linkedProblemCount} of these are linked to active problems.
                </span>
                <Link to="/problems" className="text-ois-primary hover:underline font-medium">
                  View problems →
                </Link>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ois-border bg-ois-surface-muted/40">
                <th className="px-4 py-2.5 text-left">
                  <button onClick={() => toggleCISort('publicId')} className="flex items-center text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider hover:text-ois-text transition-colors">
                    CI <SortIcon field="publicId" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <button onClick={() => toggleCISort('count')} className="flex items-center text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider hover:text-ois-text transition-colors">
                    Incidents <SortIcon field="count" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <button onClick={() => toggleCISort('lastIncident')} className="flex items-center text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider hover:text-ois-text transition-colors">
                    Last incident <SortIcon field="lastIncident" />
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">Problem linked</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {sortedCIs.map((ci, idx) => {
                const hasActiveProblem = linkedProblemCISet.has(ci.ciId);
                return (
                  <tr key={ci.ciId} className="hover:bg-ois-surface-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-ois-primary">{ci.publicId ?? ci.ciId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 rounded-full bg-ois-primary/20 overflow-hidden"
                          style={{ width: 80 }}
                        >
                          <div
                            className="h-full bg-ois-primary rounded-full"
                            style={{ width: `${(ci.count / topCIs[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-ois-text">{ci.count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ois-text-muted">
                      {ci.lastIncidentTime ? formatRelative(ci.lastIncidentTime) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {hasActiveProblem ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ● Active
                        </span>
                      ) : (
                        <span className="text-xs text-ois-text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/cmdb/${ci.publicId ?? ci.ciId}`}
                        className="inline-flex items-center gap-1 text-xs text-ois-primary hover:underline"
                      >
                        View
                        <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* SLA breakdown */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-ois-text">SLA performance by priority</h2>
          <p className="text-xs text-ois-text-muted mt-0.5">Resolve SLA compliance rate</p>
        </CardHeader>
        <CardBody>
          <SLAPerformancePanel incidents={filteredIncidents} />
        </CardBody>
      </Card>
      </div>
    </div>
  );
};
